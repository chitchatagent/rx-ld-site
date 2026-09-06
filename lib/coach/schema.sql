-- Ask-the-Coach — database schema (Neon).
--
-- Apply to the Neon database referenced by DATABASE_URL. Idempotent.
--   psql "$DATABASE_URL" -f lib/coach/schema.sql
-- or run the statements through @neondatabase/serverless.

-- D6 — per-embed rate limiting (see lib/coach/ratelimit.js).
-- Fixed-window counters. One row per (scope_key, window_kind, window_start);
-- `count` is incremented per request. Stale rows are pruned opportunistically
-- by ratelimit.js and can also be swept by the retention cron.
CREATE TABLE IF NOT EXISTS coach_rate_limit (
  scope_key    text        NOT NULL,
  window_kind  text        NOT NULL,   -- '10min' | '1hour'
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (scope_key, window_kind, window_start)
);

CREATE INDEX IF NOT EXISTS coach_rate_limit_window_start_idx
  ON coach_rate_limit (window_start);

-- D3 — turn logging (deferred; lib/coach/log.js still writes to stdout).
-- Left here so the schema file is the single source of truth once D3 lands.
-- CREATE TABLE IF NOT EXISTS coach_turn ( ... );
