// POST /api/coach  — the Ask-the-Coach endpoint (design doc §4).
//
// LAB STATUS: gated by a shared secret (COACH_LAB_TOKEN). No tools, no browsing,
// tight output cap, scenario context assembled server-side. Turn logging goes to
// stdout for now (see lib/coach/log.js). Not wired into the demo modules.

import { streamText } from "ai";
import { getScenario } from "../lib/coach/scenarios.js";
import { buildSystemPrompt, escalationSentence, PROMPT_VERSION } from "../lib/coach/prompt.js";
import {
  piiFlags,
  manipulationSuspected,
  roleplayAttempt,
  extractionAttempt
} from "../lib/coach/flags.js";
import { logTurn } from "../lib/coach/log.js";

const COACH_MODEL = "anthropic/claude-sonnet-5"; // decision D1 — start on Sonnet
const MAX_OUTPUT_TOKENS = 600;                    // §7 — keep any coerced monologue small
const TEMPERATURE = 0.3;
const MAX_MESSAGES = 16;                          // 8 learner + 8 coach
const MAX_LEARNER_TURNS = 8;                      // hard cap per conversation
const MAX_CHARS = 2000;                           // per message
const RATE = { max: 8, windowMs: 60_000 };        // approximate; real limit is D6

// Best-effort in-memory rate limit. Fluid Compute reuses instances so this
// mostly holds; it is not a guarantee and resets on cold start.
const hits = new Map();
function rateLimited(key) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < RATE.windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > RATE.max;
}

function uaFamily(ua = "") {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return "Chrome";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  return "Other";
}
function referrerHostPath(ref) {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    return u.host + u.pathname;
  } catch {
    return null;
  }
}
function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

// Named method export (not `export default`) so both `vercel dev` and the
// deployment route this through the Web handler path — a real `Request` in,
// a `Response` out. Other methods get an automatic 405.
export async function POST(request) {
  // lab-only shared-secret gate (goes away / changes for the real embed)
  // `request.url` is absolute on a Vercel deployment but path-only under
  // `vercel dev` — the base makes `new URL` accept both; only searchParams is read.
  const url = new URL(request.url, "http://localhost");
  const token = request.headers.get("x-coach-lab-token") || url.searchParams.get("token");
  const expected = process.env.COACH_LAB_TOKEN;
  if (!expected) return text("COACH_LAB_TOKEN is not set on the server.", 500);
  if (token !== expected) return text("Not authorised for the coach lab.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return text("Body must be JSON.", 400);
  }

  const scenario = getScenario(body?.moduleId);
  if (!scenario) return text('Unknown moduleId. Use "04" or "05".', 400);

  const conversationId =
    typeof body.conversationId === "string" && /^[\w-]{6,64}$/.test(body.conversationId)
      ? body.conversationId
      : crypto.randomUUID();

  const raw = Array.isArray(body.messages) ? body.messages : [];
  if (raw.length === 0) return text("messages[] is required.", 400);
  if (raw.length > MAX_MESSAGES) return text("This conversation is long enough — start a fresh one.", 400);

  const messages = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) {
      return text("Each message needs role user|assistant.", 400);
    }
    if (typeof m.content !== "string" || m.content.length === 0) {
      return text("Each message needs non-empty string content.", 400);
    }
    messages.push({ role: m.role, content: m.content.slice(0, MAX_CHARS) });
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user") return text("The last message must be from the learner.", 400);

  const learnerText = last.content;
  const learnerTurns = messages.filter((m) => m.role === "user").length;

  // classification of the latest learner message
  const isRoleplay = roleplayAttempt(learnerText);
  const isExtraction = extractionAttempt(learnerText);
  const learnerFlags = [];
  if (piiFlags(learnerText).length) learnerFlags.push("pii_suspected");
  if (manipulationSuspected(learnerText)) learnerFlags.push("manipulation_suspected");

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const commonLog = {
    conversationId,
    moduleId: String(body.moduleId),
    scenarioTitle: scenario.scenario_title,
    embedReferrer: referrerHostPath(request.headers.get("referer")),
    uaFamily: uaFamily(request.headers.get("user-agent") || "")
  };

  // over the per-conversation turn cap, or hammering the endpoint: fixed close-out
  if (learnerTurns > MAX_LEARNER_TURNS || rateLimited(`${conversationId}:${ip}`)) {
    const msg =
      "That's as far as the coach goes in one sitting. If you still have a question about this scenario, start a fresh session — and for anything beyond it, your compliance officer is the right next stop.";
    await logTurn({ ...commonLog, role: "learner", text: learnerText, flags: [...learnerFlags, "rate_limited"] });
    await logTurn({
      ...commonLog,
      role: "coach",
      text: msg,
      promptVersion: PROMPT_VERSION,
      model: COACH_MODEL,
      flags: ["rate_limited"]
    });
    return text(msg, 200);
  }

  await logTurn({ ...commonLog, role: "learner", text: learnerText, flags: learnerFlags });

  const system = buildSystemPrompt(scenario);
  const startedAt = Date.now();

  const result = streamText({
    model: COACH_MODEL,
    system,
    messages,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    abortSignal: request.signal,
    onError({ error }) {
      // streamText suppresses errors into the stream; surface them in the logs
      // eslint-disable-next-line no-console
      console.error("COACH_MODEL_ERROR " + JSON.stringify({ conversation_id: conversationId, err: String(error) }));
    },
    async onEnd({ text: full, usage, finishReason }) {
      const lc = (full || "").toLowerCase();
      const coachFlags = [];
      // escalation_pointer: the canonical design-doc sentence, OR a paraphrase
      // that still (a) names an escalation channel and (b) marks the question as
      // beyond what the module settles. Literal-only matching missed paraphrased
      // pointers (red-team G-group), under-reporting the flag.
      const escTarget = scenario.escalation_target.toLowerCase();
      const namesEscalationChannel =
        lc.includes(escTarget) ||
        lc.includes("compliance officer") ||
        lc.includes("title ix") ||
        lc.includes("title 9") ||
        lc.includes("compliance office");
      const marksBeyondModule =
        lc.includes("judgment call your district") ||
        /\b(module|training|scenario)\b[^.?!]{0,60}\b(doesn'?t|does not|can'?t|cannot|won'?t|isn'?t going to)\b[^.?!]{0,40}\b(settle|resolve|cover|answer|decide|address)\b/.test(lc) ||
        /\bnot (something|one|yours|mine) to settle\b/.test(lc) ||
        /\bbeyond (what )?(this|the) (short )?(module|training|scenario)\b/.test(lc) ||
        /\b(a )?real gap\b/.test(lc) ||
        /\bthis is (exactly )?the kind of (situation|question|thing|call)\b/.test(lc);
      const directsElsewhere =
        /\b(take|bring|raise) (this|that|it) (up )?(to|with)\b/.test(lc) ||
        /\b(a |one )?(real )?(question|call|decision) (for|to make is)\b/.test(lc) ||
        /\b(ask|check with|talk to|go to|loop in) (your|whoever|someone|the)\b/.test(lc) ||
        /\bnot something to (guess|decide|settle) \b/.test(lc);
      if (
        lc.includes(escalationSentence(scenario).toLowerCase()) ||
        lc.includes("judgment call your district") ||
        (marksBeyondModule && (namesEscalationChannel || directsElsewhere))
      ) {
        coachFlags.push("escalation_pointer");
      }
      if (lc.includes("only help with this scenario") || lc.includes("can only help with")) {
        coachFlags.push("off_topic_redirect");
      }
      if (isRoleplay) coachFlags.push("roleplay_refused");
      if (isExtraction) coachFlags.push("extraction_refused");
      if (finishReason === "length") coachFlags.push("truncated");
      await logTurn({
        ...commonLog,
        role: "coach",
        text: full || "",
        promptVersion: PROMPT_VERSION,
        model: COACH_MODEL,
        tokensIn: usage?.inputTokens ?? null,
        tokensOut: usage?.outputTokens ?? null,
        latencyMs: Date.now() - startedAt,
        flags: coachFlags
      });
    }
  });

  return result.toTextStreamResponse({
    headers: {
      "x-coach-model": COACH_MODEL,
      "x-coach-prompt-version": PROMPT_VERSION,
      "x-coach-conversation": conversationId,
      "x-coach-req-flags": [...learnerFlags, ...(isRoleplay ? ["roleplay_attempt"] : []), ...(isExtraction ? ["extraction_attempt"] : [])].join(",") || "none"
    }
  });
}
