// Turn logging (design doc §9). The schema below is the final one.
//
// v0 sink: one structured line per turn to the function's stdout, captured by
// `vercel logs`. Good enough to run the red-team pass and eyeball transcripts.
//
// To wire the real store (decision D3): implement persist() as an INSERT into
// the Neon table, and add the text-stripping job with a SPLIT window — 7 days
// for turns whose flags include "pii_suspected", 30 days for the rest. Names are
// flagged, not masked, so the 7-day early-strip is what bounds how long a
// typed-in student name persists. Nothing else in this file changes.
// See red-team.md -> "Wiring the log store".

import { maskPii } from "./flags.js";

async function persist(record) {
  // eslint-disable-next-line no-console
  console.log("COACH_LOG " + JSON.stringify(record));
}

/**
 * @param {{
 *   conversationId: string, moduleId: string, scenarioTitle: string,
 *   role: "learner" | "coach", text: string,
 *   promptVersion?: string, model?: string,
 *   tokensIn?: number, tokensOut?: number, latencyMs?: number,
 *   flags?: string[], embedReferrer?: string|null, uaFamily?: string|null
 * }} entry
 */
export async function logTurn(entry) {
  const record = {
    ts: new Date().toISOString(),
    conversation_id: entry.conversationId,
    module_id: entry.moduleId,
    scenario_title: entry.scenarioTitle,
    role: entry.role,
    // learner text is masked before storage; coach text is stored as sent
    text: entry.role === "learner" ? maskPii(entry.text) : entry.text,
    prompt_version: entry.promptVersion ?? null,
    model: entry.model ?? null,
    tokens_in: entry.tokensIn ?? null,
    tokens_out: entry.tokensOut ?? null,
    latency_ms: entry.latencyMs ?? null,
    flags: entry.flags ?? [],
    embed_referrer: entry.embedReferrer ?? null,
    ua_family: entry.uaFamily ?? null
  };
  try {
    await persist(record);
  } catch (err) {
    // never swallow — a failed log write is itself logged
    // eslint-disable-next-line no-console
    console.error("COACH_LOG_FAIL " + JSON.stringify({ ts: record.ts, conversation_id: record.conversation_id, err: String(err) }));
  }
  return record;
}
