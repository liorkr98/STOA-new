# SCALE.md - Scale Readiness & Infrastructure Hardening

Living runbook for running Stoa at social-network scale. Companion to `AGENTS.md`.
Covers caching, idempotency, rate limiting, the job queue, observability, database
depth, security, and disaster recovery. The two-axis video Feed is a
separate project and is intentionally not covered here.

## Layers

1. CDN - Bunny (video, thumbnails), Vercel edge for static assets.
2. Edge/API - Next.js on Vercel, auto-scales per request.
3. Cache - Upstash Redis (hot reads, rate limits, non-money idempotency keys).
4. Postgres - Supabase + Supavisor pooling.
5. Background jobs - Upstash QStash (grading, notification fan-out, video pipeline).

The core product objects are immutable (a locked report, a published video, a
resolved call never change), so they cache at maximum aggression with zero
staleness risk. Trust architecture doubles as performance architecture.

## Environment

Server-only. Absent = graceful degrade (in-memory cache/ratelimit, cron-only jobs).

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` - Redis (cache, rate limit, idempotency).
- `QSTASH_TOKEN` - publish jobs.
- `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` - verify job callbacks.
- `QSTASH_TARGET_BASE_URL` - origin QStash calls back to (defaults to `NEXT_PUBLIC_SITE_URL`).

## Idempotency

- Money mutations (`purchase_report`, `top_up`, `subscribe_to_analyst`,
  `subscribe_to_plan`) use Postgres wrappers `*_idem` + the `money_idempotency`
  guard table (migration 0046). The PRIMARY KEY `(owner_id, client_request_id)`
  makes a concurrent duplicate impossible; a failed charge rolls back and
  releases the key so a retry is allowed. Never Redis (an eviction must never
  permit a double-charge).
- Non-money mutations (report publish, video upload/publish) use the HTTP
  `Idempotency-Key` header, stored in Redis for 24h via `src/lib/http/idempotency.ts`.
  The client sends a UUID per action attempt; a retry replays the stored result.
- Webhooks: PayPal, Bunny, Cloudflare dedupe via `processed_webhook_events`.

## Rate limiting

Upstash sliding window via `src/lib/ratelimit` + `withHandler`. Per-IP for anon,
per-user for authed. Current limits (per 60s unless noted):

- `market-quote`, `market-sparkline`, `market-news`, `market-peers`, `stats-platform`, `dispatch`, `track-view`: 120/IP.
- `search`: 60/user-or-ip.
- `report-publish`, `video-publish`: 30/user. `video-upload`: 20/user.

Legacy Postgres `check_rate_limit` remains on low-volume AI/market editor routes;
migrate the hottest to Redis as load grows to keep limiter traffic off Postgres.

## Job queue (QStash)

`src/lib/jobs` publishes; consumer routes under `src/app/api/jobs/*` verify the
QStash signature. Jobs are idempotent, retried with backoff, and dead-letter to
`#bugs` via `notifySlack`. Migrated: grading/resolution, notification fan-out,
video transcription/fact-check. Cron still triggers grading (enqueues batches).

## Caching

- Market reads (`getQuote`, candles, news, peers) use a two-tier cache
  (`src/lib/cache`): L1 in-memory per instance, L2 Redis shared across instances.
  TTLs by data class (`src/lib/market/cache.ts`): quote 15s, intraday 60s, etc.
- Report and profile reads use tag-based `unstable_cache`; `revalidateTag` fires
  on resolution (grade job), publish, and profile edit. Locked/resolved content
  is immutable so it caches hard.
- CDN `Cache-Control` headers stay on public market/stats routes.

## Database

- Missing FK/filter indexes added in migration 0047.
- `video_view_events` is partitioned by month (migration 0048); the
  `/api/cron/maintenance` job (monthly) calls `ensure_video_view_partitions` so
  there is always a landing zone, plus the TTL cleanups. `audit_log` partitioning
  is deferred to a staging-first migration because of its append-only triggers.
  Next candidates after that: `report_views`, `notifications`, `wallet_transactions`.
- `pg_stat_statements` enabled. **Weekly during growth**: review top queries by
  total time; the query that is fine at 1k rows can fall over at 1M.
- TTL cleanup: `cleanup_money_idempotency`, `api_rate_limits`, `processed_webhook_events`.
- Supavisor: confirm transaction-mode pooling for serverless; verify pool size
  against function concurrency in the load test. Read replica: add only when
  read load is sustained and separable from writes - not before.

## Observability

- `withHandler` emits one JSON log line per request (requestId, route, status,
  latencyMs, userId, idempotencyKey), and echoes `x-request-id` on the response.
- Sentry captures errors + performance traces; sample rate is
  `SENTRY_TRACES_SAMPLE_RATE` (default 0.1 in prod, 1.0 in dev).
- A daily `#ops` system-health post (`postSystemHealth`) reports cache/queue
  status, last grade snapshot, and the grading backlog (open calls past due).
- Trace one full request path (app -> API -> cache -> DB) manually before
  assuming where time goes.

## Load testing (`load/`)

k6 scenarios: feed/dispatch pagination (500-1000 VUs), `/api/market/quote` burst
on one hot symbol, `purchase_report` concurrency (race check), auth burst.
Thresholds fixed up front: warm p95 < 400ms, error rate < 0.1%, no DB pool
exhaustion. Run against staging sized like production, before any video-first rollout.

## Security

- Automated RLS suite (`npm run test:rls`, `tests/rls/`) runs in CI on every
  schema change; asserts anon/owner/other-user/admin allow/deny on the paywall,
  predictions, wallet, notifications, admin tables.
- Dependabot (`.github/dependabot.yml`) scans npm + actions weekly.
- Vercel Firewall / bot protection: enable on `/api/*` in the Vercel dashboard
  (Project -> Firewall). This is a second layer; server-side entitlement (RLS on
  `report_bodies`, signed video URLs) remains the primary paywall enforcement.
- Independent security review: run the `security-review` agent on the hardening
  diff before shipping, then a human tries to break it.

### Secrets rotation

All keys are environment config, never hardcoded. Rotatable without a code deploy
(update in Vercel -> redeploy or re-pull). Owners:

- Supabase service role / DB: founder (Supabase dashboard).
- PayPal client/secret + webhook id: founder (PayPal dashboard).
- Market data (Finnhub, FMP, Twelve Data, Alpha Vantage): founder.
- Upstash Redis/QStash tokens: founder (Upstash console).
- `CRON_SECRET`, Slack tokens: founder.

Rotate on suspected exposure and on a routine cadence during growth.

## Disaster recovery

PITR is a go-live Must. An untested backup is a hypothesis, not a plan. Run this
drill once, deliberately, and record the result.

Drill steps:

1. In the Supabase dashboard, note a target timestamp (a few minutes ago).
2. Create a new scratch project (same region as production).
3. Restore the production backup / PITR snapshot into the scratch project.
4. Verify integrity: row counts on `reports`, `predictions`, `wallet_transactions`,
   `profiles` match expectations; spot-check a locked call and a wallet balance.
5. Time the whole restore end to end.
6. Delete the scratch project.

- Recorded RTO: _pending first drill_.
- Cadence: re-drill after any major schema change or quarterly, whichever first.

## Region

Finding (from `get_project`): the Supabase project **STOA** is in
**`ap-southeast-1` (Singapore)**, while users are in the **US and Israel**. That
is a cross-hemisphere round-trip on every uncached DB query and is the most
likely source of avoidable latency today.

Recommended action (founder decision, one-time):

- Choose a primary region close to the user base - `us-east-1` (US East) or
  `eu-central-1` (Frankfurt, closer to Israel). Frankfurt is the better single
  compromise for a US+Israel audience.
- Moving a Supabase region is a migration (new project + data transfer + DNS/env
  cutover), not a slider - plan it before traffic grows, not after.
- Co-locate Vercel functions with the chosen DB region (Vercel function region
  setting) so the API-to-DB hop is in-region.
- The Redis cache layer added here blunts the impact of the current distance for
  hot reads, but writes and cache misses still pay the full round-trip.

- Recorded choice: _pending founder decision_ (recommendation: `eu-central-1`).
