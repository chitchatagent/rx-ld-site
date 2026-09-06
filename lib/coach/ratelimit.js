// D6 — per-embed rate limiting for the tokenless /api/coach embed path.
//
// Backed by Neon (decision 2026-09-06: no new integration; cost at real scale
// is trivial). Fixed-window counters in `coach_rate_limit` (see schema.sql),
// two windows checked per request. A valid COACH_LAB_TOKEN skips this entirely
// (the caller is the lab, not a public embed) — that check lives in api/coach.js.
//
// Scope key: IP + embedding-page (Referer host/path), falling back to IP alone.
// On breach: the caller returns HTTP 429 + Retry-After — an honest rate-limit
// message, NOT the conversation-turn-cap close-out.
//
// Fail-closed: this function throws if Neon is unreachable; the caller
// (api/coach.js) turns that into a 429 rather than serving an unlimited
// request. For a compliance product a brief outage beats an unmetered window.

import { neon } from "@neondatabase/serverless";

// Limits are config-driven so Production can tune without a deploy.
const WINDOWS = [
  { kind: "10min", ms: 10 * 60_000, max: intEnv("COACH_RATE_10MIN", 30) },
  { kind: "1hour", ms: 60 * 60_000, max: intEnv("COACH_RATE_1HOUR", 120) }
];

function intEnv(name, fallback) {
  const n = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

let _sql = null;
function db() {
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL / POSTGRES_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

/** IP + embed-referrer, IP alone when there is no referrer. Bounded length. */
export function scopeKey(ip, embedReferrer) {
  const i = String(ip || "unknown").slice(0, 45);
  return (embedReferrer ? `${i}|${String(embedReferrer).slice(0, 150)}` : i);
}

/**
 * Increment the fixed-window counters for `key` and report whether a limit is
 * now exceeded. Windows are checked smallest-first and short-circuit: a request
 * rejected by the 10-minute window is not counted against the hourly one.
 *
 * @returns {Promise<{limited:false} | {limited:true, retryAfter:number, message:string, window:string}>}
 */
export async function checkRateLimit(key) {
  const now = Date.now();
  const sql = db();

  for (const w of WINDOWS) {
    const windowStart = new Date(Math.floor(now / w.ms) * w.ms).toISOString();
    const rows = await sql`
      INSERT INTO coach_rate_limit (scope_key, window_kind, window_start, count)
      VALUES (${key}, ${w.kind}, ${windowStart}, 1)
      ON CONFLICT (scope_key, window_kind, window_start)
      DO UPDATE SET count = coach_rate_limit.count + 1
      RETURNING count
    `;
    const count = rows[0]?.count ?? 1;
    if (count > w.max) {
      const retryAfter = Math.max(
        1,
        Math.ceil((Math.floor(now / w.ms) * w.ms + w.ms - now) / 1000)
      );
      const mins = Math.ceil(retryAfter / 60);
      return {
        limited: true,
        window: w.kind,
        retryAfter,
        message:
          `The coach is getting a lot of requests from this page right now, so it's paused for a bit. ` +
          `Try again in about ${mins} minute${mins === 1 ? "" : "s"}.`
      };
    }
  }

  // Opportunistic prune (~1% of calls) so the table doesn't grow unbounded
  // between retention-cron runs. Best-effort; failure is ignored.
  if (Math.random() < 0.01) {
    try {
      await sql`DELETE FROM coach_rate_limit WHERE window_start < NOW() - INTERVAL '3 hours'`;
    } catch {
      /* ignore */
    }
  }

  return { limited: false };
}
