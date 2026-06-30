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
src/app/            Routes. (marketing) public, (app) investor, studio/ analyst.
src/components/     UI primitives (ui/), charts, layout, and feature components.
src/lib/db/         The only place that talks to Supabase (typed queries).
src/lib/engine/     Scoring, market data, and the grading job.
src/lib/wallet/...  Wallet flows live in actions/wallet.ts + Postgres RPCs.
supabase/migrations Schema, RLS, functions, storage.
scripts/            seed.ts (demo data), grade.ts (run the engine once).
```

Not financial advice. Stoa is a research marketplace, not a broker or investment adviser.
