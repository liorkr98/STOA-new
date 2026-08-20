# New data contracts for the rebrand

> **Product model updated** — see `docs/PRODUCT_MODEL.md`. This document predates that change and needs review.

Written by the frontend/design pass on `design/full-rebrand`, for whoever picks up the backend
side (Cursor). Nothing here should be built by the frontend agent -- `src/lib/db/*` is the only
place that talks to Supabase per AGENTS.md, and payments/schema are backend scope.

## Already covered, no new backend work needed

- **Track Score display.** `profiles.score` (0-100, clamped) is the Track Score number. The engine
  (`src/lib/engine/score.ts`) already does Wilson-lower-bound hit rate, decay-weighted profit
  factor, alpha vs SPY, and a logarithmic sample-size ramp -- that ramp *is* the spec's
  "provisional score for small samples" concept. `MoatBadge` (`src/components/ui/moat-badge.tsx`)
  flags `provisional` client-side when `sampleSize < 10`; no new column required. `profiles.tier`
  already maps to the tier badge.
- **Fact-check claims.** `reports.fact_check_results` (jsonb) + `src/lib/ai/fact-check.ts` already
  runs AI classification and stores `FactClaim[]` (`text`, `type`, `note`, `confidence`,
  `verifiableTicker`, `yahooCheck`). The spec's `<FactCheckLayer>` wants `char_start`/`char_end`
  offsets for inline underlining, which this shape doesn't store. Frontend plan: locate
  `claim.text` inside the rendered body string at render time to derive offsets, rather than
  requesting a schema change. `ClaimType` (`Fact | Opinion | Misleading | Unverified |
  Yahoo-Verified | Yahoo-Disputed`) maps to the spec's 4-value verdict taxonomy as: Fact /
  Yahoo-Verified -> `fact`, Unverified -> `unproven`, Opinion -> `opinion`, Misleading /
  Yahoo-Disputed -> `contradicted`. This mapping lives in the frontend adapter, not the DB.

## Genuinely new, needs backend

- **`debate_threads` / `debate_replies` tables.** Scoped comment threads anchored to one opinion
  claim on one report (spec Part 2 `<DebateThread>`). Needs: `report_id`, `claim_index` (or a
  stable claim id once `fact_check_results` gets one), `author_id`, `body`, `created_at`,
  optional `parent_reply_id` for threading depth if wanted.
- **A public report excerpt for the paywall preview.** `getReport()` (`src/lib/db/reports.ts`)
  fetches body text from `report_bodies`, which is RLS-gated per the "Harden paywall" migration --
  a non-entitled reader's `bodyRow` comes back null, full stop. The spec's `<PaywallGate>` (2.4)
  wants a 2-3 paragraph preview under a soft scrim before the CTA, which needs either a separate
  `reports.excerpt` column (public, written at publish time, RLS-open) or an RLS policy that lets
  everyone read the first N characters of `report_bodies.body`. `PaywallGate` is built to accept
  an optional `previewText` and falls back to the current hard-cutoff behavior when it's absent,
  so this isn't blocking, just currently inert.
- **Paywall assumes dual unlock paths that the schema doesn't support yet.** Spec 2.4 shows both
  "Unlock this report -- $4" and "Subscribe to [Creator] -- $12/mo" as parallel CTAs on every
  gated report. `reports.access` is a single enum (`subscribers | paid | free`) -- a report is one
  or the other, not both. Showing a Subscribe button that wouldn't actually unlock a
  per-report-priced piece would be misleading. Frontend keeps the real single-CTA behavior for
  now; if you want genuine either/or unlock paths, `access` needs to become non-exclusive (e.g. a
  report could be both subscriber-included and separately purchasable).
- **Dual investor/creator roles per account.** `Role = "user" | "analyst" | "admin"` (single
  exclusive enum, `src/lib/types.ts`) -- an account can't hold both investor and creator
  capabilities at once. The spec's `<TopNav>` role switcher (2.1) is explicitly designed to be
  absent unless an account has both `role_investor` and `role_creator` true, so the frontend
  component (`RoleSwitcher`) is built and wired but will always no-op today, same pattern as the
  other new pieces. Needs `role` to become non-exclusive (boolean flags or a join table) to ever
  actually show.
- **PayPal integration** (replacing the planned-but-never-built Stripe Connect from
  `docs/ROADMAP.md`). Confirmed via PayPal's official developer docs this session:
  - **Seller onboarding**: Partner Referrals API. Redirect-based hosted flow (seller clicks a
    signup link, logs into/creates PayPal, grants permission, redirected back). PayPal runs KYC
    itself -- this is why we're not building a separate identity-verification step.
    <https://developer.paypal.com/docs/multiparty/seller-onboarding/>
  - **One-time report purchases with the 10% platform cut**: Orders v2 API,
    `purchase_units[].payment_instruction.platform_fees[]`. Seller must be onboarded with the
    `PARTNER_FEE` feature. Direct equivalent of Stripe's `application_fee_amount`.
    <https://developer.paypal.com/docs/multiparty/checkout/multiseller-payments/>
  - **Recurring investor->creator subscriptions**: PayPal's *multiparty* Subscriptions API
    (separate from the plain Subscriptions API) supports a seller payee + per-cycle platform fee.
    <https://developer.paypal.com/docs/multiparty/subscriptions/integrate/>
  - **Disbursement timing**: `INSTANT` or `DELAYED` (up to 28-day hold). Earnings & Payouts UI
    (spec 6.6) should show a "funds available" vs "pending hold" split if `DELAYED` is used.
  - No PayPal product does what Stripe Identity did. Per product decision, the creator onboarding
    wizard drops the Verify step entirely (Brand -> Price -> First Report -> Done).
- **Founding-member tier fields** on `profiles` or a new `pricing_tiers` table: quantity cap,
  discounted price, claimed count (spec 6.8).
- **Referral tracking**: a creator-specific referral code/link and attribution on signup (spec
  6.5). Simple one-table job (`referral_code`, `referred_by`, `attributed_at`).
- **`watchlists` table** (spec 5.6). `/watchlist` is built and fully working, but backed by
  `localStorage` (`src/lib/watchlist.ts`) rather than the database -- doesn't sync across devices
  or survive a cleared browser. Needs `watchlist_items(user_id, ticker, created_at)`, RLS scoped to
  the owner. Swap `useWatchlist()`'s localStorage read/write for a Supabase query once it exists;
  the component API (`tickers`, `toggle`, `has`) can stay the same.
