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
- **Money:** a simulated wallet/credits system with a 90/10 split, built so real Stripe can drop
  in later.

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
2. In the Supabase dashboard, open **SQL Editor** and run the migration files in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_functions.sql`
   - `supabase/migrations/0004_storage.sql`
   - `supabase/migrations/0005_rating_expiry_indexes.sql`
   - `supabase/migrations/0006_market_reference_data.sql` (optional — Kaggle fundamentals)
   - `supabase/migrations/0007_subscription_cancel.sql`
   - `supabase/migrations/0008_profile_config.sql`
   - `supabase/migrations/0009_ai_credits.sql`
   - `supabase/migrations/0010_profile_bootstrap.sql`
   - `supabase/migrations/0011_social_notifications.sql`
   - `supabase/migrations/0012_trust_compliance.sql` (disclosure fields, immutability triggers, audit log)
   - `supabase/migrations/0013_claims_debate.sql` (structured fact-checker claims + claim-scoped debate)
   - `supabase/migrations/0014_identity_connect.sql` (Stripe Identity + Connect scaffolding — safe to run without Stripe keys)
   - `supabase/migrations/0015_score_breakdown.sql` (persists hit rate / profit factor / alpha on the profile)
   - `supabase/migrations/0016_platform_transfers.sql` (real-money earnings ledger, additive to the wallet system)
3. Copy `.env.example` to `.env.local` and fill in the values from **Project Settings -> API**:

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

## Real-money rail (Stripe Connect + Identity) — scaffolded, optional

The simulated wallet is the live economy today; nothing below is required to run the app. Once
`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_IDENTITY_WEBHOOK_SECRET` are set:

- `src/lib/stripe/connect.ts` — creates Stripe Express accounts, onboarding links, and dashboard
  login links. `POST /api/creator/connect/onboard`, `GET /api/creator/connect/dashboard-link`.
- `src/lib/stripe/identity.ts` — creates Stripe Identity verification sessions.
  `POST /api/creator/verify-identity`.
- `src/lib/stripe/webhooks.ts` — `POST /api/webhooks/stripe` (`account.updated`,
  `payment_intent.succeeded`, `invoice.paid`) and `POST /api/webhooks/stripe-identity`
  (`identity.verification_session.verified/.requires_input`) keep `connect_accounts`,
  `identity_verifications`, `profiles.identity_verified`, and the `platform_transfers` earnings
  ledger in sync.
- The platform fee split (10%) lives in `splitPlatformFee()` — the same rate the wallet's SQL
  functions already use, kept in one place.

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
src/lib/stripe/     Connect (payouts), Identity (KYC), and webhook dispatch. Optional, additive.
src/lib/wallet/...  Wallet flows live in actions/wallet.ts + Postgres RPCs.
supabase/migrations Schema, RLS, functions, storage, immutability triggers, audit log.
scripts/            seed.ts (demo data), grade.ts (run the engine once).
```

Not financial advice. Stoa is a research marketplace, not a broker or investment adviser.
