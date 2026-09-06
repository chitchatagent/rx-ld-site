// POST /api/coach  — the Ask-the-Coach endpoint (design doc §4).
//
// Two callers:
//   - the lab (`coach-lab.html`): sends a valid COACH_LAB_TOKEN → no per-scope
//     rate limit, only the per-conversation turn cap.
//   - a public embed (demo modules, after step 4): no token → subject to the
//     D6 per-embed rate limit (lib/coach/ratelimit.js, Neon-backed).
// No tools, no browsing, tight output cap, scenario context assembled
// server-side. Turn logging goes to stdout for now (see lib/coach/log.js).

import { streamText } from "ai";
import { getScenario } from "../lib/coach/scenarios.js";
import { buildSystemPrompt, escalationSentence, PROMPT_VERSION } from "../lib/coach/prompt.js";
import {
  piiFlags,
  manipulationSuspected,
  roleplayAttempt,
  extractionAttempt,
  offTopicRedirect
} from "../lib/coach/flags.js";
import { logTurn } from "../lib/coach/log.js";
import { scopeKey, checkRateLimit } from "../lib/coach/ratelimit.js";

const COACH_MODEL = "anthropic/claude-sonnet-5"; // decision D1 — start on Sonnet
// §7 — keep any coerced monologue small. 600 was too tight: when the model
// reasons, the reasoning tokens count against this cap and can consume it
// entirely, leaving an empty `truncated` reply (red-team C1). Disable extended
// thinking for this call and give the answer text a real budget.
const MAX_OUTPUT_TOKENS = 1000;
const PROVIDER_OPTIONS = { anthropic: { thinking: { type: "disabled" } } };
const TEMPERATURE = 0.3;
const MAX_MESSAGES = 16;                          // backstop for a well-formed thread (8 + 8)
const HARD_MAX_MESSAGES = 60;                     // absolute guard before the validation loop
const MAX_LEARNER_TURNS = 8;                      // hard cap per conversation
const MAX_CHARS = 2000;                           // per message

// Per-request rate limiting for the tokenless embed path is D6 — cross-instance,
// Neon-backed (lib/coach/ratelimit.js). The old best-effort in-memory Map was
// removed with it; the only in-process cap left is MAX_LEARNER_TURNS below.

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
function text(body, status = 200, extraHeaders) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", ...extraHeaders }
  });
}

// Named method export (not `export default`) so both `vercel dev` and the
// deployment route this through the Web handler path — a real `Request` in,
// a `Response` out. Other methods get an automatic 405.
export async function POST(request) {
  // `request.url` is absolute on a Vercel deployment but path-only under
  // `vercel dev` — the base makes `new URL` accept both; only searchParams is read.
  const url = new URL(request.url, "http://localhost");
  const token = request.headers.get("x-coach-lab-token") || url.searchParams.get("token");
  const labToken = process.env.COACH_LAB_TOKEN;
  // A valid lab token is the "authenticated, higher-limit" path: it skips the
  // D6 per-scope rate limit (still bound by the per-conversation turn cap).
  // No token is allowed — that is the public embed path, which D6 governs.
  const authed = Boolean(labToken) && token === labToken;

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
  if (raw.length > HARD_MAX_MESSAGES) return text("Too many messages in one request.", 400);

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

  // D6 — per-embed rate limit (public path only). Checked after validation so a
  // 400 doesn't consume quota, and before the model call. Honest 429 + Retry-
  // After, never disguised as the turn-cap close-out. Fails CLOSED: if the
  // limiter can't run (Neon unreachable), refuse rather than serve unlimited —
  // a brief "unavailable" beats "no limit at all" for a compliance product.
  if (!authed) {
    let rl;
    try {
      rl = await checkRateLimit(scopeKey(ip, commonLog.embedReferrer));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("COACH_RATELIMIT_ERROR " + JSON.stringify({ err: String(err) }));
      return text(
        "The coach is briefly unavailable. Please try again in a minute.",
        429,
        { "retry-after": "60" }
      );
    }
    if (rl.limited) {
      // eslint-disable-next-line no-console
      console.log("COACH_RATELIMIT " + JSON.stringify({
        window: rl.window,
        retry_after: rl.retryAfter,
        embed_referrer: commonLog.embedReferrer,
        ua_family: commonLog.uaFamily
      }));
      return text(rl.message, 429, { "retry-after": String(rl.retryAfter) });
    }
  }

  // Over the per-conversation turn cap: graceful close-out. Checked BEFORE the
  // message-count backstop below so a 9th learner turn gets this 200, not a
  // blunt 400 (red-team H3). The `rate_limited` flag name is historical — this
  // is the conversation-length cap, not the D6 request-rate limit above.
  if (learnerTurns > MAX_LEARNER_TURNS) {
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

  // Under the turn cap but the history is still longer than a clean 8 + 8
  // thread (padded or non-alternating): decline plainly.
  if (raw.length > MAX_MESSAGES) {
    return text("This conversation is long enough — start a fresh one.", 400);
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
    providerOptions: PROVIDER_OPTIONS,
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
      if (offTopicRedirect(full)) coachFlags.push("off_topic_redirect");
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
