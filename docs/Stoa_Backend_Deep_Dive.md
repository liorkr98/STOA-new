# Stoa Backend — Deep Dive

> **Product model updated** — see `docs/PRODUCT_MODEL.md`. This document predates that change and needs review.

Living backend spec for STOA-new. Amended per PM framework review (Edge Cases, Launch Checklist, G/W/T acceptance criteria, MoSCoW).

**Stack:** Next.js 15 App Router · Supabase Postgres + RLS · Yahoo Finance (live quotes) · PayPal (real-money rail, optional)

---

## §0 — Principles

- **Trust = immutability:** locked reports, frozen calls, append-only `audit_log`.
- **Payments:** PayPal Commerce Platform (not Stripe Connect — unavailable for Israel-based platforms).
- **Resolution timezone:** every call resolves against the **primary listing exchange's** local close, stored per ticker in `tickers.timezone` (§4).
- **GDPR vs immutability (§13):** verified erasure requests **pseudonymize** `profiles` PII; `reports` / `claims` / score snapshots remain under an anonymized handle. **Requires legal sign-off before production.**

---

## §3 — Schema (core)

### Reports & predictions

| Table | Key fields |
|-------|------------|
| `reports` | `status`: `draft` \| `published` \| `archived` \| **`resolution_pending_review`** |
| `predictions` | `target_horizon_date` (date), `resolution_trading_date` (date), `resolves_at`, `outcome` includes **`neutral`** |
| `tickers` | `symbol`, `exchange`, **`timezone`**, **`status`**: `active` \| `delisted` \| `acquired` |
| `processed_webhook_events` | `(provider, event_id)` PK — webhook idempotency |
| `api_rate_limits` | sliding-window counters for expensive routes |

### Horizon validation (Must #1)

`publishReport` rejects when `target_horizon_date <= today` in the ticker's exchange timezone.

**G/W/T:** Given a creator sets a horizon date of today or earlier, When they publish, Then the request is rejected naming the invalid date.

Implementation: `src/app/actions/reports.ts` + `src/lib/engine/trading-calendar.ts`.

### Ticker delisting (Should #9)

When `tickers.status` ≠ `active`, the resolution job resolves open calls as **`neutral`** immediately and excludes them from the Track Score (`computeScore` filters `neutral`).

---

## §4 — Resolution timezone (Must #4)

- `target_horizon_date` is a bare `date` interpreted in `tickers.timezone`.
- `resolves_at` is scheduled to exchange close (US: 16:00 ET).
- International tickers: add row to `tickers` with correct IANA timezone before enabling publish.

---

## §5 — Resolution job (`gradeDuePredictions`)

Cron: `GET /api/cron/grade` (hourly, `CRON_SECRET`). CLI: `npm run grade`.

### Weekend / holiday substitution (Must #2)

If `target_horizon_date` is not a trading day, resolve against the **next trading day's** close. Log substitution in `audit_log` (`horizon_substituted: true`).

**G/W/T:** Given horizon falls on Saturday, When the job runs, Then Monday's session is used and audit log records the substitution.

### No market data (Must #3)

If no live quote is available (`getQuotesBatch({ allowMock: false })`), set `reports.status = resolution_pending_review`. Do **not** grade hit/miss. Track Score unchanged. No false notifications.

**G/W/T:** Given provider returns no price, When job runs, Then status becomes `resolution_pending_review` and the Track Score is unaffected.

### Manual admin resolve

`POST /api/admin/resolve-report` — admin only. Body: `{ reportId, resolvedPrice, outcome? }`. For rows stuck in `resolution_pending_review`.

Query queue: `select * from reports where status = 'resolution_pending_review'`.

### Monitoring (Should #8)

Set `CRON_ALERT_WEBHOOK_URL` (Slack/email webhook). Cron posts `{ event: "grade.ok" | "grade.failed", ... }` on success/failure.

---

## §6 — Track Score engine

Pure functions in `src/lib/engine/score.ts`. Persisted to `profiles` by grading job.

- Wilson lower bound win rate (time-decayed)
- Profit factor
- Alpha vs SPY (percentile-ranked when ≥5 benchmarked calls platform-wide)
- Sample shrinkage: `log(1+n) / log(76)` — small samples cannot dominate
- **`neutral` outcomes excluded** from all Track Score inputs

### Tests (Should #10)

`npm run test:engine` → `src/lib/engine/score.test.ts`

Checklist:
- Shrinkage at n=1 vs n=50
- 100% hit rate on 2 calls scores below 80% hit rate on 50 calls
- Neutral outcomes excluded

---

## §9 — API surface

| Route | Purpose |
|-------|---------|
| `POST /api/ai/fact-check` | Claim extraction — **20 req/hour/creator** (`check_rate_limit` RPC) |
| `POST /api/webhooks/paypal` | PayPal events — **idempotent** via `processed_webhook_events` |
| `POST /api/admin/resolve-report` | Manual resolution for pending-review reports |
| `GET /api/cron/grade` | Hourly grading + platform stats MV refresh |
| `GET /api/creators/[id]/moat` | **Addendum #2** — `{ current, previous }` Track Score snapshots for odometer animation |
| `GET /api/search?q=` | **Addendum #2** — trigram typeahead: `{ creators, tickers }` (~5 each) |
| `GET /api/stats/platform` | **Addendum #2** — trust-bar aggregates from `platform_stats` MV (`Cache-Control: max-age=3600`) |
| `POST /api/feed/dismiss` | **Addendum #2** — persist "Not interested"; excluded in `listFeed()` |
| `POST /api/reports/[id]/publish` | Publish + chart screenshot URL validation + `report.published` audit |
| `DELETE /api/reports/[id]` | Delete draft + chart-snapshots storage cleanup |
| `GET /api/market/candles` | Authenticated OHLC for chartNode (`symbol` + `range`, 60 req/min) |

### Webhook idempotency (Must #5 — adapted for PayPal)

Original spec referenced Stripe; implementation uses PayPal. Same guarantee:

**G/W/T:** Given PayPal redelivers an already-processed event, When handler receives it, Then no duplicate `platform_transfers` row and handler returns 200.

Implementation: `src/lib/paypal/webhooks.ts` — `isWebhookProcessed` / `markWebhookProcessed`.

---

## §10 — Launch readiness (Could #12)

- Enable Supabase **Point-in-Time Recovery** before real-money launch.
- Document restore procedure in runbook.
- Set `CRON_ALERT_WEBHOOK_URL` in production.

---

## §11 — Repo layout

```
src/lib/engine/
  score.ts              Track Score formula (pure, tested)
  grade.ts              Resolution + score persistence
  trading-calendar.ts   Weekend/holiday rules
  tickers.ts            Per-symbol timezone + status
src/app/actions/reports.ts   publishReport + horizon validation
src/app/api/admin/resolve-report/route.ts
src/app/api/creators/[id]/moat/route.ts
src/app/api/search/route.ts
src/app/api/stats/platform/route.ts
src/app/api/feed/dismiss/route.ts
supabase/migrations/0018_pm_framework_backend.sql
supabase/migrations/0019_addendum_contract_gaps.sql
supabase/migrations/0020_chart_snapshots_storage.sql
src/lib/reports/chart-screenshots.ts
```

---

## §12 — Build order (MoSCoW tags — Could #13)

| Step | Scope | MoSCoW |
|------|-------|--------|
| 1–6 | Schema, RLS, publish/lock, wallet | **Must** |
| 7 | PayPal payouts | **Must** before real money; separable for local dev |
| 8 | Resolution + Track Score cron | **Must** for complete trust loop; briefly testable without |
| 9 | Feed / follows / notifications | **Should** |

---

## §13 — GDPR pseudonymization (Must #6)

Function: `pseudonymize_user(p_user_id uuid)` (migration 0018).

On verified deletion request:
1. Replace `profiles` PII with generic placeholders (`deleted_<uuid-prefix>` handle).
2. Leave `reports`, `claims`, `moat_score_snapshots` intact under anonymized handle.
3. Write `audit_log` action `user.pseudonymized`.

**Flag for legal/compliance sign-off before enabling in production.**

---

## Migrations

Run in order through **`0020_chart_snapshots_storage.sql`** after `0019`.

```bash
# Or use combined bootstrap for fresh projects:
# supabase/bootstrap-remote.sql
```

---

## Changelog (PM framework review)

| # | Priority | Item | Status |
|---|----------|------|--------|
| 1 | Must | Horizon date validation on publish | ✅ |
| 2 | Must | Weekend/holiday resolution + audit | ✅ |
| 3 | Must | `resolution_pending_review` + admin resolve | ✅ |
| 4 | Must | Per-ticker timezone | ✅ |
| 5 | Must | Webhook idempotency (PayPal) | ✅ |
| 6 | Must | GDPR pseudonymization §13 | ✅ (SQL + doc; legal sign-off pending) |
| 7 | Should | Fact-check rate limit 20/hr | ✅ |
| 8 | Should | Cron monitoring webhook | ✅ |
| 9 | Should | Ticker delisting → neutral | ✅ |
| 10 | Should | score.test.ts | ✅ |
| 11 | Could | Draft lifecycle nudges | 📋 ticket |
| 12 | Could | PITR launch checklist | 📋 doc |
| 13 | Could | MoSCoW on build order | ✅ |

---

## Changelog (Addendum #2 — motion/polish contract gaps)

| # | Priority | Item | Status |
|---|----------|------|--------|
| A1 | Must | `GET /api/creators/[id]/moat` → `{ current, previous }` from `moat_score_snapshots` | ✅ |
| A2 | Must | `GET /api/search?q=` + `pg_trgm` indexes on profiles + tickers | ✅ |
| A3 | Should | `GET /api/stats/platform` via `platform_stats` MV (cron refresh) | ✅ |
| A4 | Should | `feed_dismissals` + `POST /api/feed/dismiss` + feed exclusion | ✅ |
| A5 | Could | Referral `?ref=<handle>` → `profiles.referred_by` + audience count | ✅ |

---

## Changelog (Chart screenshots + candles)

| # | Priority | Item | Status |
|---|----------|------|--------|
| C1 | Must | `chart-snapshots` storage bucket + RLS | ✅ |
| C2 | Must | `GET /api/market/candles` (auth + rate limit on Yahoo OHLC proxy) | ✅ |
| C3 | Must | Publish chart URL validation + `report.published` audit | ✅ |
| C4 | Should | Draft delete → storage cleanup | ✅ |
| C5 | Should | `extract_chart_screenshot_urls` SQL helper | ✅ |
