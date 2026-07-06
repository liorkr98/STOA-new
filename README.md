# Stoa (Next.js rebuild)

A marketplace for independent stock research with a verified, public track record on every call.
This is a clean-slate rebuild with no Base44: Next.js (App Router) + Supabase + a server-side
scoring engine fed by real market data.

Tagline: Think clearly. Invest better.

## What is in here

- **Frontend:** Next.js App Router, React 19, TypeScript, Tailwind v4, Motion, Phosphor icons.
- **Backend:** Supabase (Postgres, Auth, Storage, Row Level Security, secure wallet RPCs).
- **Engine:** a 0-100 analyst score (win rate + profit factor + alpha) mapped to a 600-1400 rating,
  with automatic grading of calls against live prices on a schedule.
- **Money:** a simulated wallet/credits system with a 90/10 split, built so real PayPal payouts can
  drop in later (PayPal, not Stripe Connect, since Stripe Connect payouts aren't available for
  Israel-based platforms/sellers).

See `design-system/MASTER.md` for the visual system and `AGENTS.md` for the rules every AI agent
(Cursor and Claude Code) follows.

## Prerequisites

- Node.js 20+ and npm.
- A free Supabase project (https://supabase.com).
- Optional: fallback API keys for Twelve Data or Alpha Vantage if Yahoo is unavailable. Without any live feed the engine uses deterministic mock prices.

## 1. Install

```bash
npm install
```

## 2. Set up Supabase

1. Create a project at https://supabase.com.
2. In the Supabase dashboard, open **SQL Editor → New query**.
3. **Paste the SQL contents** — not the filename. Typing `0001_init.sql` in the editor will fail with `trailing junk after numeric literal`.

   **Easiest (recommended):** open `supabase/bootstrap-remote.sql` in this repo, copy **the entire file**, paste into SQL Editor, and click **Run once**. It runs migrations `0001`–`0017` in order.

   **Or run one file at a time:** open each file under `supabase/migrations/`, copy **all of its SQL**, paste into SQL Editor, run, then move to the next:

   - `0001_init.sql` — starts with `-- Stoa schema: core tables`
   - `0002_rls.sql`
   - `0003_functions.sql`
   - `0004_storage.sql`
   - `0005_rating_expiry_indexes.sql`
   - `0006_market_reference_data.sql` (optional — Kaggle fundamentals)
   - `0007_subscription_cancel.sql`
   - `0008_profile_config.sql`
   - `0009_ai_credits.sql`
   - `0010_profile_bootstrap.sql`
   - `0011_social_notifications.sql`
   - `0012_trust_compliance.sql` (disclosure fields, immutability triggers, audit log)
   - `0013_claims_debate.sql` (structured fact-checker claims + claim-scoped debate)
   - `0014_paypal_accounts.sql` (PayPal Partner Referrals onboarding — safe to run without PayPal keys)
   - `0015_score_breakdown.sql` (persists hit rate / profit factor / alpha on the profile)
   - `0016_platform_transfers.sql` (real-money earnings ledger, additive to the wallet system)
   - `0017_analyst_applications.sql` (analyst application funnel + admin approval)
4. Copy `.env.example` to `.env.local` and fill in the values from **Project Settings -> API**:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server only, keep secret
TWELVE_DATA_API_KEY=                 # optional fallback if Yahoo fails
ALPHA_VANTAGE_API_KEY=               # optional last-resort fallback
CRON_SECRET=<a long random string>
```

## 3. Seed demo data (optional but recommended)

```bash
npm run seed
```

This creates demo analysts with real track records, a demo investor
(`investor@stoa.demo` / `stoademo123`), and a body of published research and calls. Analyst logins
look like `maren_vos@stoa.demo` / `stoademo123`.

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000. The public marketing site renders even before Supabase is configured;
sign-in, the feed, profiles, and Studio need the backend set up.

## Trust & compliance layer

Anything that becomes part of a creator's public track record is append-only — enforced with
Postgres triggers, not just app-level checks:

- **Locking:** the instant a report's status becomes `published`, `locked_at` is set and a trigger
  blocks further edits to its title, summary, ticker, access, price, and body. Only `status`
  (archiving), engagement counters, and `fact_check_results` stay mutable.
- **Calls are permanently frozen** the moment they're created — ticker, direction, lock/target
  price, horizon, and the SPY benchmark lock can never change, calls can never be deleted, and a
  resolved outcome can never be re-resolved.
- **Fact-check claims** (`claims` table — one row per atomic assertion, with character offsets for
  inline highlighting) freeze the same instant the parent report locks.
- **`audit_log`** is an append-only trail (admin-read only, no update/delete policy) auto-populated
  by triggers on report lock/archive, call resolution, and payouts — the answerable record for any
  future regulatory question.
- **Mandatory disclosure block:** `reports.position_disclosed/held`, `compensation_disclosed/tied/detail`,
  and `views_certified` (a Reg-AC-style "these are my own views" cert). `publishReport` blocks the
  publish server-side once the caller starts sending a certification value — see
  `src/app/actions/reports.ts`.

## Fact-checker pipeline

`src/lib/fact-check/` splits the pipeline into pure, independently testable steps:

1. **`claim-extraction.ts`** — sends the report body to OpenAI (mock fallback without a key) to
   decompose it into atomic claims.
2. **`claim-classification.ts`** — cross-checks numeric claims against live Yahoo Finance quotes,
   maps the result onto the `claim_verdict` enum (`fact` / `unproven` / `opinion` / `contradicted`),
   and locates each claim's character offsets in the source text.
3. Claims persist to the `claims` table via `persistClaims` (`src/app/actions/claims.ts`), called
   from `POST /api/ai/fact-check` when a `reportId` is supplied. Debate comments
   (`postDebateComment`) are only allowed on `opinion`-verdict claims, enforced both server-side and
   by RLS.

## Real-money rail (PayPal) — scaffolded, optional

PayPal, not Stripe Connect — Stripe Connect payouts aren't available for Israel-based
platforms/sellers, PayPal is. The simulated wallet is the live economy today; nothing below is
required to run the app. No SDK dependency — PayPal's REST API is plain JSON over `fetch`, same
pattern as the OpenAI integration. Once `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` /
`PAYPAL_PARTNER_ID` are set:

- `src/lib/paypal/partner.ts` — Partner Referrals onboarding (PayPal's analog to Stripe Connect
  Express): creates a hosted onboarding link, and polls
  `GET /v1/customer/partners/{partner_id}/merchant-integrations` for status.
  `POST /api/creator/paypal/onboard`, `GET /api/creator/paypal/status`.
- **No separate identity/KYC step** — PayPal performs its own verification during the seller's
  onboarding flow itself (signing up for / logging into PayPal and granting permissions), so
  `profiles.identity_verified` is derived directly from PayPal's own
  `payments_receivable` + `primary_email_confirmed` signals via `upsert_paypal_account()`, not a
  separate product like Stripe Identity.
- `src/lib/paypal/orders.ts` — Orders API v2 one-time payments with a platform-fee split via
  `purchase_units[].payment_instruction.platform_fees`.
- `src/lib/paypal/webhooks.ts` — `POST /api/webhooks/paypal` handles `MERCHANT.ONBOARDING.COMPLETED`,
  `PAYMENT.CAPTURE.COMPLETED`, and `BILLING.SUBSCRIPTION.*`. Signature verification calls PayPal's
  own `/v1/notifications/verify-webhook-signature` endpoint (PayPal doesn't do local HMAC
  verification the way Stripe does).
- The platform fee split (10%) lives in `splitPlatformFee()` — the same rate the wallet's SQL
  functions already use, kept in one place.
- **Real platform-fee splits require PayPal partner approval** (the `PARTNER_FEE` feature) — same
  category of caveat as Stripe Connect requiring platform approval. Onboarding itself works in
  sandbox without it.

See `docs/platform.md` for the full external-services table.

## How grading works

- When an analyst publishes a call, the entry price is locked from the market feed server-side
  (`src/app/actions/reports.ts`). The SPY price is captured for alpha.
- The scheduled job (`src/app/api/cron/grade/route.ts` -> `src/lib/engine/grade.ts`) expires
  lapsed subscriptions, finds calls whose timeframe has ended, pulls prices via Yahoo Finance
  (with optional fallbacks), grades each call, and recomputes score, rating, and tier.
- Run it manually any time:

```bash
npm run grade
```

## Deploy

### Backend

Your Supabase project is already the backend. Keep the service-role key out of the client.

### Frontend on Vercel

1. Push this folder to a Git repository (see below) and import it into Vercel.
2. Add the same environment variables in the Vercel project settings.
3. `vercel.json` registers an hourly cron that calls `/api/cron/grade`. Vercel automatically sends
   `Authorization: Bearer $CRON_SECRET`, which the route verifies.

## Pushing to a brand-new repository

This project was authored as a self-contained folder. To make it its own repo:

```bash
cd stoa-next
git init
git add .
git commit -m "Stoa: initial Next.js + Supabase rebuild"
git branch -M main
git remote add origin <your-new-repo-url>
git push -u origin main
```

## Project layout

```
src/app/            Routes. (marketing) public, (app) investor, studio/ analyst, api/ route handlers.
src/components/     UI primitives (ui/), charts, layout, and feature components.
src/lib/db/         The only place that talks to Supabase (typed queries).
src/lib/engine/     Scoring (score.ts), market data (engine/market/), and the grading job (grade.ts).
src/lib/fact-check/ Claim extraction + classification — pure, testable pipeline steps.
src/lib/paypal/     Partner Referrals (payouts + onboarding KYC) and webhook dispatch. Optional, additive.
src/lib/wallet/...  Wallet flows live in actions/wallet.ts + Postgres RPCs.
supabase/migrations Schema, RLS, functions, storage, immutability triggers, audit log.
scripts/            seed.ts (demo data), grade.ts (run the engine once).
```

Not financial advice. Stoa is a research marketplace, not a broker or investment adviser.

---

## Agent handoff — current state & next steps

**Copy everything below this line into a new agent session** when continuing work on Stoa.

### Project

- **Repo:** https://github.com/liorkr98/STOA-new
- **Branch:** `main` (all feature work merged as of July 2026)
- **Owner:** liorkr98@gmail.com (Israel-based — **PayPal for payouts, not Stripe Connect**)
- **Supabase project:** `https://cqhenicrfdkbsshyszex.supabase.co` (credentials in local `.env.local`, not in git)
- **Tagline:** Think clearly. Invest better.
- **Product:** Substack-style marketplace for independent stock research. Analysts publish calls/research; investors subscribe or pay per report. Moat = verified, permanent track record (server-side price lock + automatic grading).

### Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 App Router, React 19, TypeScript, Tailwind v4, Motion, Phosphor icons |
| Backend | Supabase (Postgres, Auth, Storage, RLS, RPCs) |
| Market data | **Yahoo Finance** primary (`yahoo-finance2`), Twelve Data + Alpha Vantage fallbacks — abstracted behind `MarketProvider` in `src/lib/engine/market/` |
| AI | OpenAI (`gpt-4o-mini`) for fact-check + compose assist; mock fallback without key |
| Payments (live) | **PayPal Partner Referrals** (scaffolded) — simulated wallet is the live economy today |
| Cron | Vercel hourly → `/api/cron/grade` (or `npm run grade` locally) |
| Lint | ESLint (Next.js), no Biome in this repo |

### Roles & access model

| Role | Can do |
|---|---|
| `user` (investor) | Read, subscribe, unlock, like, comment, save, post quick notes on Discover |
| `analyst` | Everything above + Studio compose, publish research/calls, set pricing |
| `admin` | Everything above + `/admin/applications` (approve/reject analyst applications) |

**Analyst access is gated:** investors apply at `/become-analyst` → admin approves at `/admin/applications` → role flips to `analyst`. Migration `0017` auto-approves `liorkr98@gmail.com`.

### What is DONE (merged to `main`)

#### Core product loop
- Auth (Supabase magic link / OAuth), profiles, wallets (simulated $100 on signup)
- Publish research, calls, short posts via block compose editor (`/studio/compose`)
- Server-side price lock at publish (Yahoo Finance) + SPY benchmark for alpha
- Hourly grading cron grades open calls, recomputes score/rating/tier
- Discover feed, analyst profiles, leaderboard, markets browser, search
- Wallet: top-up (demo), subscribe (90/10 split), pay-per-report unlock
- Comments, likes, follows, saves, inbox notifications
- Account dropdown menu, settings, profile branding (avatar/cover/sections)

#### Social / Substack-style layer
- QuickPost composer on Discover (`postNote` — any signed-in user)
- Newsletter fan-out on publish (notifies followers + active subscribers)
- Social notifications (follow, like, comment, publication, sale, subscribe)

#### Track record UI
- Score breakdown, hit/near/miss counts, tier progress on analyst profiles
- Full call ledger with alpha vs SPY on `/analyst/[handle]`

#### AI features
- AI credits economy (wallet → credits, spend on chat/outline/fact-check)
- FactChecker panel in compose (classify claims, Yahoo price cross-check)
- Report templates (earnings recap, deep dive, etc.)

#### Analyst application funnel (migration 0017)
- `/become-analyst` — 3 required + 2 optional questions, pending/approved/rejected status screens
- `/admin/applications` — admin-only list with inline approve/reject + optional note
- Server actions: `submitAnalystApplication`, `approveAnalystApplication`, `rejectAnalystApplication`
- Nav: investors see "Apply to publish"; admins see "Review applications"

#### Backend deep dive (migrations 0012–0016)

**Trust & compliance (`0012_trust_compliance.sql`)**
- `locked_at` set automatically when report status → `published`
- DB triggers freeze report content, call terms, and fact-check claims after lock
- Calls cannot be deleted; resolved outcomes cannot be re-resolved
- Append-only `audit_log` (admin-read only) auto-populated on lock/archive/resolve/payout
- Mandatory disclosure columns on `reports` (position, compensation, views_certified)
- `publishReport` enforces disclosure server-side once caller sends certification values

**Structured fact-checker (`0013_claims_debate.sql`)**
- `claims` table: one row per atomic assertion, character offsets, `claim_verdict` enum
- `debate_comments` scoped to single claim, opinion-verdict only (RLS + server action)
- Pure pipeline: `src/lib/fact-check/claim-extraction.ts` + `claim-classification.ts`
- Persists via `persistClaims()` when `POST /api/ai/fact-check` receives a `reportId`

**PayPal payouts (`0014_paypal_accounts.sql`, `0016_platform_transfers.sql`)**
- `paypal_accounts` table + Partner Referrals onboarding
- PayPal does KYC itself during onboarding (no separate Identity product)
- `src/lib/paypal/{client,partner,orders,webhooks}.ts`
- Routes: `POST /api/creator/paypal/onboard`, `GET /api/creator/paypal/status`, `POST /api/webhooks/paypal`
- `platform_transfers` earnings ledger for real-money audit trail
- **Stripe was removed** — not available for Israel-based platforms

**MOAT score transparency (`0015_score_breakdown.sql`)**
- `profiles` persists `wilson_win_rate`, `profit_factor`, `avg_return`, `avg_alpha`, `sample_size`
- Alpha percentile-ranked against platform distribution (not fixed ±20% band)
- Grading job (`src/lib/engine/grade.ts`) writes breakdown on each pass

### Migrations — RUN THESE IN SUPABASE SQL EDITOR

Apply **in order** through **`0017`**. If you've already run `0001`–`0011`, only run the new ones:

```
0012_trust_compliance.sql      ← immutability triggers, audit_log, disclosure fields
0013_claims_debate.sql         ← structured claims + debate comments
0014_paypal_accounts.sql       ← PayPal onboarding table (safe without PayPal keys)
0015_score_breakdown.sql       ← score breakdown columns on profiles
0016_platform_transfers.sql    ← real-money earnings ledger
0017_analyst_applications.sql  ← application funnel + auto-approve liorkr98@gmail.com
```

After `0017`, sign in as `liorkr98@gmail.com` → role should be `analyst` → **Write** button opens compose.

### Environment (`.env.local`)

```bash
cp .env.example .env.local
```

Required:
```
NEXT_PUBLIC_SUPABASE_URL=https://cqhenicrfdkbsshyszex.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard — server only>
CRON_SECRET=<any long random string>
```

Optional:
```
OPENAI_API_KEY=              # fact-check + compose AI (mock fallback without)
OPENAI_MODEL=gpt-4o-mini
TWELVE_DATA_API_KEY=         # market data fallback
ALPHA_VANTAGE_API_KEY=       # market data last resort
PAYPAL_MODE=sandbox          # real payments (not needed yet)
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_PARTNER_ID=
PAYPAL_WEBHOOK_ID=
```

### Run locally

```bash
npm install
npm run dev          # http://localhost:3000 (or 3001 if 3000 busy)
npm run seed         # demo analysts + investor@stoa.demo / stoademo123
npm run grade        # manually run grading engine once
```

### Key file map

```
src/app/
  (app)/become-analyst/       Application funnel (investors apply)
  (app)/admin/applications/   Admin approve/reject UI
  (app)/discover/             Feed + QuickPost composer
  (app)/analyst/[handle]/     Public analyst profile + track record
  (app)/report/[id]/          Report reader + fact-check results
  (app)/settings/             Profile settings
  studio/compose/             Block editor (analysts only)
  actions/
    profile.ts                submitAnalystApplication, approve/reject, ensureProfile
    reports.ts                saveDraft, publishReport (disclosure + price lock)
    claims.ts                 persistClaims, postDebateComment
    social.ts                 follow, like, comment, save
  api/
    ai/fact-check/            POST — run fact-check, optionally persist claims
    creator/paypal/onboard/   POST — start PayPal onboarding
    creator/paypal/status/    GET — poll onboarding status
    webhooks/paypal/          POST — PayPal webhook handler
    cron/grade/               GET — hourly grading job (CRON_SECRET)

src/lib/
  engine/score.ts             MOAT formula (Wilson + PF + alpha percentile)
  engine/grade.ts             Grading job (resolve calls, recompute scores)
  engine/market/              Yahoo Finance + fallbacks (MarketProvider interface)
  fact-check/                 Pure claim extraction + classification
  paypal/                     PayPal REST client, partner, orders, webhooks
  ai/fact-check.ts            Backward-compat shim for compose UI
  db/                         Typed Supabase queries (only place that talks to DB)
  types.ts                    Domain types mirroring Postgres schema

supabase/migrations/          0001–0017 (see list above)
docs/ROADMAP.md               Product roadmap (done vs next)
docs/platform.md              External services tracker
```

### Git push notes (Cursor cloud VM)

The cloud agent terminal uses SSH keys at `~/.ssh/id_ed25519_github`. Cursor injects global git config that rewrites SSH → HTTPS with `cursor[bot]` (which gets 403). Before pushing:

```bash
# Remove Cursor URL rewrites
python3 << 'PY'
from pathlib import Path
p = Path.home() / '.gitconfig'
lines = p.read_text().splitlines(keepends=True)
out, skip = [], False
for line in lines:
    if line.startswith('[url '): skip = True; continue
    if skip:
        if line.startswith('\t') or line.startswith(' '): continue
        skip = False
    out.append(line)
p.write_text(''.join(out))
PY
git remote set-url origin git@github.com:liorkr98/STOA-new.git
git push origin main
```

### What is NOT done yet — recommended next steps

Priority order for the next agent pass:

1. **Run migrations 0012–0017 in Supabase** (if not done) — nothing new works without these
2. **Disclosure block UI in compose** — backend contract exists (`position_held`, `compensation_tied`, `views_certified` in `ComposeInput` + `publishReport`); compose editor needs the actual checkbox/step before Publish is enabled
3. **Settings → Payouts page** — wire `POST /api/creator/paypal/onboard` + `GET /api/creator/paypal/status` into a UI at `/settings/payouts` so analysts can connect PayPal
4. **PayPal checkout UI** — replace simulated wallet subscribe/unlock with PayPal Orders flow once creator has `paypal_accounts.status = 'active'` (requires PayPal partner approval for `PARTNER_FEE`)
5. **Inline claim highlighting** — `claims` table has `char_start`/`char_end` offsets; report reader should highlight claims inline (data exists, UI not built)
6. **Debate UI on opinion claims** — `postDebateComment` action + RLS exist; no UI on report page yet
7. **Email newsletter delivery** — in-app fan-out works; add Resend/Postmark for actual emails
8. **Legal pages** — `/terms`, `/privacy` are placeholders; need real investment disclaimers
9. **Direct messages UI** — `messages` table + RLS exist; no frontend
10. **Automated tests** — engine (`score.ts`, `grade.ts`) and paywall RPCs have no test coverage

### Architecture decisions (do not reverse without discussion)

- **PayPal, not Stripe** — owner is Israel-based; Stripe Connect unavailable
- **Yahoo Finance, not Finnhub** — live API; Finnhub only appears as Kaggle dataset names for static imports
- **Simulated wallet stays live** — PayPal is additive; demo/top-up/subscribe/unlock RPCs unchanged until PayPal checkout UI ships
- **Analyst approval required** — no instant role upgrade; admin must approve (except liorkr98@gmail.com via migration 0017)
- **Append-only track record** — enforced by Postgres triggers, not app code; do not add "edit published report" features
- **RLS on `report_bodies`** — paywall at DB layer; never expose full body to client without entitlement check
- **Score engine is server-side only** — `src/lib/engine/score.ts` is the single source of truth; UI reads persisted breakdown from `profiles`

### Scoring engine summary

Composite 0–100 → display rating 600–1400:

1. **Win rate** — Wilson lower bound on time-weighted outcomes (Hit=1, Near=0.5, Miss/Partial=0)
2. **Profit factor** — decay-weighted avg win / avg loss
3. **Alpha** — excess return vs SPY; percentile-ranked against all creators when 5+ benchmarked calls exist
4. **Consistency** — penalties for miss streaks and drawdown
5. **Sample ramp** — logarithmic confidence discount for small samples

Tiers: Building (<5 calls) → Rising → Strong → Expert → Elite → Legend

Grading outcomes: Hit (reached target), Near (right direction, short of target), Partial (flat ±1.5%), Miss (wrong direction).

### Demo accounts (after `npm run seed`)

| Account | Password | Role |
|---|---|---|
| `investor@stoa.demo` | `stoademo123` | investor |
| `maren_vos@stoa.demo` | `stoademo123` | analyst |
| `liorkr98@gmail.com` | (your password) | analyst (after migration 0017) |

### End of agent handoff section

<!-- deploy trigger 2026-07-06T09:16:38Z -->
