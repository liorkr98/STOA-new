# STOA Product Roadmap

Stoa is a **marketplace for independent stock research** where analysts publish research and investors pay for access; the platform takes 10%. Publications are **video-first** (a short analyst video, optionally enriched with a locked call, evidence cards, and a written thesis); only publications with a locked call are scored. The moat is a **verified, permanent, non-transferable track record** shown as the **Track Score** (0-100): every scored call locks an attested entry price server-side and is graded by the market when the horizon ends. Full model: `docs/PRODUCT_MODEL.md`.

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
- Publish video-first research (CALL / RESEARCH / NOTE)
- Server-side price lock + SPY benchmark at publish
- Hourly grading cron + CLI (`npm run grade`)
- Track Score (0-100) is the only score in the UI; the 600-1400 rating display + tiers are retired. Underlying formula is an open decision (modified Elo vs Wilson/PF/alpha composite) — see `docs/PRODUCT_MODEL.md`
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
- **Account menu** — one tap to profile, studio, wallet, saved, subs, settings, branding
- **Notes** — inline quick-post composer on the feed (Substack-style social layer)
- **Newsletter fan-out** — publishing notifies followers + active subscribers
- **Social notifications** — follow, like, comment, publication, sale, subscribe in the inbox
- **Track record surfaced** — score breakdown, hit/near/miss, tier progress, full call ledger with alpha
- **Analyst application funnel** — investors apply with a short questionnaire, admin approves/rejects at `/admin/applications`, only approved analysts get compose access
- **PM framework backend (0018)** — horizon validation, trading-calendar resolution, `resolution_pending_review`, webhook idempotency, fact-check rate limits — see `docs/Stoa_Backend_Deep_Dive.md`
- **Trust & compliance layer** — locked reports/calls are DB-enforced append-only (immutability triggers, not just app checks), mandatory disclosure block, append-only `audit_log`
- **Structured fact-checker claims** — `claims` table with character offsets (inline highlighting–ready) + claim-scoped debate comments, opinion-verdict only
- **Track Score transparency** — hit rate, profit factor, avg return, and alpha (now percentile-ranked platform-wide, not a fixed band) persisted on the profile for the analytics page
- **PayPal Partner Referrals — schema, lib, routes, webhook scaffolded** (`src/lib/paypal/`), additive to the simulated wallet. PayPal instead of Stripe Connect, since Stripe Connect payouts aren't available for Israel-based platforms/sellers. Needs live API keys to actually move money — see next section.

## In progress / next (high priority)

1. **Real payments — go live** — the PayPal plumbing exists (`src/lib/paypal/`, `platform_transfers` ledger, `paypal_accounts` table); what's left is: add `PAYPAL_*` keys, get the platform approved by PayPal for the `PARTNER_FEE` feature (required for the 10% split — same category of approval Stripe Connect would have needed), build the Checkout UI for subscribe + unlock, and switch `subscribe_to_analyst`/`purchase_report` callers to the PayPal path once a creator's `paypal_accounts.status = 'active'`.
2. **Analyst payout status UI** — onboarding + status-poll routes exist server-side (`POST /api/creator/paypal/onboard`, `GET /api/creator/paypal/status`); needs a Settings page entry point.
3. **Subscription auto-renew** — or clear manual renewal UX
4. **Legal pages** — reviewed ToS, privacy, investment disclaimers (not placeholders)
5. **Disclosure block UI** — backend contract exists (`reports.position_disclosed/held`, `compensation_*`, `views_certified`, enforced server-side in `publishReport`); compose editor needs the actual step before publish.

## Later (parity + polish)

- Email delivery of newsletters (Resend/Postmark) on top of in-app fan-out
- PDF export, translate
- Scheduled publish, boost posts
- Direct messages UI (messages table + RLS already exist)
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

Apply every file in `supabase/migrations/` in order (see the `supabase/migrations/` directory for
the current full list; it now extends well past `0017_analyst_applications.sql`) on your Supabase
project via the SQL Editor.

```bash
npm run seed          # demo analysts + investor
npm run import:kaggle # optional SEC + SP futures data
npm run dev
```

Demo investor: `investor@stoa.demo` / `stoademo123`
