# STOA Product Roadmap

Stoa is a **two-sided marketplace for independent stock research** where analysts publish calls and investors pay for access. The moat is a **verified, permanent track record**: every scored call locks an entry price server-side and is graded automatically when the horizon ends.

This document compares the [legacy STOA app](https://github.com/liorkr98/STOA) (Base44 + Vite) with the [STOA-new rebuild](https://github.com/liorkr98/STOA-new) (Next.js + Supabase) and tracks what is done vs planned.

## Architecture (rebuild is better)

| Area | Old STOA | STOA-new |
|------|----------|----------|
| Backend | Base44 BaaS + partial Supabase bridge | Supabase Postgres, Auth, RLS, RPCs |
| Paywall | App-layer checks | RLS on `report_bodies` at DB layer |
| Scoring | Elo cron + Wilson client (divergent) | Unified v3 engine (Wilson + PF + alpha) |
| Price lock | Base44 function | Server action + Yahoo Finance |
| Wallet | Client `walletService.js` | Atomic Postgres RPCs (90/10 split) |
| Market data | Yahoo in Deno functions | Yahoo + fallbacks + Kaggle reference data |

## Done (core loop)

- Auth, profiles, roles (user / analyst / admin)
- Publish research, calls, short posts
- Server-side price lock + SPY benchmark at publish
- Hourly grading cron + CLI (`npm run grade`)
- Composite score, 600-1400 rating, tiers
- Discover feed (trending, recent, following, subscriptions, **researchers**)
- Analyst profiles, leaderboard, markets browser
- Wallet (simulated credits), subscribe, unlock, confirm-spend dialog
- Comments, likes, follows, save toggle
- Studio overview, compose, **draft resume**, **audience**
- **Saved library**, **inbox**, **subscriptions management**, **search**, **settings**
- **Scoring methodology** public page
- **Compose editor** — block-based studio with drag-and-drop, AI sidebar, live charts
- **Profile branding** — avatar/cover upload, section reorder, specialties
- **AI credits economy** — wallet balance → credits, spend on chat/outline/fact-check
- **FactChecker** — classify claims, Yahoo price verification, results on published reports
- **Report templates** — one-click block structures in compose (earnings recap, deep dive, etc.)

## In progress / next (high priority)

1. **Real payments** — Stripe Connect replacing simulated `top_up`
2. **Analyst payouts** — withdrawal flow (min balance, KYC later)
3. **Subscription auto-renew** — or clear manual renewal UX
4. **Legal pages** — reviewed ToS, privacy, investment disclaimers (not placeholders)

## Later (parity + polish)

- PDF export, translate
- Scheduled publish, boost posts
- Direct messages UI
- Investor home dashboard
- Creator analytics (conversion, churn, earnings breakdown)
- Admin moderation console
- Automated tests for engine + paywall RPCs
- Broader ticker universe (beyond curated 12)

## What we intentionally do better than the old site

- **One scoring system** — no Elo vs Wilson split
- **DB-enforced paywall** — harder to leak paid bodies
- **Transparent methodology page** — aligned with actual `score.ts` code
- **Normalized schema** — predictions as first-class rows, not JSON on reports
- **No vendor lock-in** — standard Supabase, portable Next.js

## Migrations to run

Apply in order through `0007_subscription_cancel.sql` on your Supabase project.

```bash
npm run seed          # demo analysts + investor
npm run import:kaggle # optional SEC + SP futures data
npm run dev
```

Demo investor: `investor@stoa.demo` / `stoademo123`
