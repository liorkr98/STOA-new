# STOA Product Roadmap

Stoa is a **marketplace for independent stock research** where analysts publish research and investors pay for access; the platform takes 10%. A publication is a **video, a brief or a thesis**, and may declare a **stance**: one ticker and a direction, long, short or hold, frozen once published. Evidence cards and a written thesis are optional enrichment. **Nothing is graded, scored, locked or resolved** (grading was retired on 2026-09-24): there is no track record, no score, no seal, no Verdict type, no entry price, no target and no horizon. Analysts are followed and paid for their judgement, not scored on it. Edit markers stay and are independent of grading. Full model: `docs/PRODUCT_MODEL.md`.

This document compares the [legacy STOA app](https://github.com/liorkr98/STOA) (Base44 + Vite) with the [STOA-new rebuild](https://github.com/liorkr98/STOA-new) (Next.js + Supabase) and tracks what is done vs planned.

## Architecture (rebuild is better)

| Area | Old STOA | STOA-new |
|------|----------|----------|
| Backend | Base44 BaaS + partial Supabase bridge | Supabase Postgres, Auth, RLS, RPCs |
| Paywall | App-layer checks | RLS on `report_bodies` at DB layer |
| Scoring | Elo cron + Wilson client (divergent) | None: grading retired 2026-09-24; placement by the lifecycle model |
| Wallet | Client `walletService.js` | Atomic Postgres RPCs (90/10 split) |
| Market data | Yahoo in Deno functions | Yahoo + fallbacks + Kaggle reference data |

## Done (core loop)

- Auth, profiles, roles (user / analyst / admin)
- Publish three types (VIDEO / BRIEF / THESIS), each with an optional stance (ticker + long, short or hold)
- The Feed (full-screen vertical video; Discover and its tabs are retired), Today, Explore
- Analyst profiles, markets browser; placement by the lifecycle model (NEW / TRENDING shown)
- Wallet (simulated credits), subscribe, unlock, confirm-spend dialog
- Comments, likes, follows, save toggle
- Studio overview, compose, **draft resume**, **audience**
- **Saved library**, **inbox**, **subscriptions management**, **search**, **settings**
- **Compose editor** — block-based studio with drag-and-drop, AI sidebar, live charts
- **Profile branding** — avatar/cover upload, section reorder, specialties
- **AI credits economy** — wallet balance → credits, spend on chat/outline/fact-check
- **FactChecker** — classify claims, Yahoo price verification, results on published reports
- **Report templates** — one-click block structures in compose (earnings recap, deep dive, etc.)
- **Account menu** — one tap to profile, studio, wallet, saved, subs, settings, branding
- **Notes** — inline quick-post composer on the feed (Substack-style social layer)
- **Newsletter fan-out** — publishing notifies followers + active subscribers
- **Social notifications** — follow, like, comment, publication, sale, subscribe in the inbox
- **Analyst application funnel** — investors apply with a short questionnaire, admin approves/rejects at `/admin/applications`, only approved analysts get compose access
- **Webhook idempotency, fact-check rate limits** (from the 0018 framework; its horizon and resolution parts are retired)
- **Trust & compliance layer** — a published piece's ticker, stance, type, access and price are DB-enforced frozen (immutability triggers, not just app checks); edits to the words are allowed and disclosed by the public EDITED marker and edit log (0063); mandatory disclosure block; append-only `audit_log`
- **Structured fact-checker claims** — `claims` table with character offsets (inline highlighting–ready) + claim-scoped debate comments, opinion-verdict only
- **Grading retired** (2026-09-24) — engine, grade job, Track Score, seals, track record, Verdict type and methodology page deleted; migration 0067 freezes `predictions` as a read-only archive
- **PayPal Partner Referrals — schema, lib, routes, webhook scaffolded** (`src/lib/paypal/`), additive to the simulated wallet. PayPal instead of Stripe Connect, since Stripe Connect payouts aren't available for Israel-based platforms/sellers. Needs live API keys to actually move money — see next section.

## In progress / next (high priority)

1. **Real payments — go live** — the PayPal plumbing exists (`src/lib/paypal/`, `platform_transfers` ledger, `paypal_accounts` table); what's left is: add `PAYPAL_*` keys, get the platform approved by PayPal for the `PARTNER_FEE` feature (required for the 10% split — same category of approval Stripe Connect would have needed), build the Checkout UI for subscribe + unlock, and switch `subscribe_to_analyst`/`purchase_report` callers to the PayPal path once a creator's `paypal_accounts.status = 'active'`.
2. **Analyst payout status UI** — onboarding + status-poll routes exist server-side (`POST /api/creator/paypal/onboard`, `GET /api/creator/paypal/status`); needs a Settings page entry point.
3. **Subscription auto-renew** — or clear manual renewal UX
4. **Legal pages** — reviewed ToS, privacy, investment disclaimers (not placeholders)
5. **The new visual system, surface by surface** — tokens and primitives moved to Direction B on 2026-09-27 (`docs/DESIGN_LANGUAGE.md`). Next: rebuild each surface on them, starting with Today, then the report page, the profile, Compose and the Feed.
6. **Drop the `predictions` archive** — once nothing reads it (the pre-0065 direction fallback in `CALL_JOIN` and `coverage.ts`), with `moat_score_snapshots` and the score columns.

## Later (parity + polish)

- Email delivery of newsletters (Resend/Postmark) on top of in-app fan-out
- PDF export, translate
- Scheduled publish, boost posts
- Investor home dashboard
- Creator analytics (conversion, churn, earnings breakdown)
- Admin moderation console
- Automated tests for paywall RPCs
- Broader ticker universe (beyond curated 12)

## What we intentionally do better than the old site

- **No scoring at all** — analysts are followed and paid, not ranked on outcomes
- **DB-enforced paywall** — harder to leak paid bodies
- **Normalized schema** — the stance lives on the publication (`reports.ticker`, `reports.stance`), not JSON on reports
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
