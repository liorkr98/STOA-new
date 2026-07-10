# AGENTS.md — Stoa (Next.js rebuild)

This file is the shared source of truth for AI coding agents. **Cursor** reads `AGENTS.md`
natively; **Claude Code** reads `CLAUDE.md`, which simply points here. Keep both in sync by
editing this file and letting `CLAUDE.md` re-export it.

**Full specs — read before any structural or visual work:**

- `docs/BACKEND.md` — schema, RLS, the MOAT scoring engine, the fact-checker pipeline, payments.
  **Does not exist yet.** No one has supplied the source content for it, so it is not being
  fabricated here. Until it exists, `supabase/migrations/*` and `docs/BACKEND_DATA_CONTRACTS.md`
  (gaps found and PayPal research from the frontend build) are the closest things to a backend
  reference in this repo.
- `docs/FRONTEND.md` — every page, every component, the full design system.

This file is the short version for day-to-day work. Those two are the long version. When they
disagree, the long version wins — update this file to match, don't patch around it.

## What Stoa is

A verified publishing marketplace where independent financial analysts publish research, lock
price targets, and get paid — with every claim fact-checked and every locked call permanently on
the record. Named after the ancient Athenian Stoa, a public place for debate and commerce.
Tagline: "Think clearly. Invest better."

**Not a social network.** The value isn't a follow graph — it's a stranger trusting another
stranger's paid opinion because the track record and the fact-check are more convincing than any
relationship. Design and copy should reflect that: the trust surface (call block, disclosure
block, MOAT badge) matters more than feed mechanics.

**Retire "OnlyFans for stock-market analysis"** everywhere it appears — code comments, seed data,
old docs. It undersells the product and is a real brand liability the first time it reaches a
pitch deck or a screenshot. If a one-line comparison is needed for a pitch, use: "Seeking Alpha's
research model with Patreon's creator economics and a trust layer neither has."

### Content types (unchanged, still correct)

| Type            | Description                                 | Feeds MOAT score? |
| ---------------- | -------------------------------------------- | ------------------ |
| Research report  | Long-form analysis with a locked call.       | Yes                |
| BUY/SELL/short call | Short call with a locked target, no long-form body. | Yes         |
| Short post        | Commentary / news reaction. No locked call.   | No                 |

### The trust mechanic — three pillars, not one

1. **Locked price targets.** Ticker, direction, target price, horizon date — locked at publish,
   enforced immutable at the *database* level (a Postgres trigger rejects the UPDATE, not just an
   app-layer check). This is the moat. See `docs/BACKEND.md` §3 once it exists.
2. **AI fact-checker.** Every claim in a report is classified: fact / unproven / opinion /
   contradicted, before publish is enabled. **Already exists in the codebase**
   (`src/lib/ai/fact-check.ts`, `reports.fact_check_results`) — not missing. The frontend now
   surfaces it inline (`FactCheckLayer`/`FactCheckedText`, `src/components/report/`) rather than
   as a separate list below the report body. What's still missing: `char_start`/`char_end`
   offsets on stored claims (the layer currently locates claim text by substring search at render
   time instead) and the `debate_threads`/`debate_replies` tables for scoped opinion-claim
   discussion. See `docs/BACKEND_DATA_CONTRACTS.md`.
3. **MOAT score.** One number, 0–100. Three-factor formula: hit rate (shrunk toward the platform
   average so small samples can't spike it), average return, sample-size weighting. **Replaces**
   the current "0–100 analyst score mapped to a 600–1400 rating" — same underlying engine
   (entry-price locking, scheduled grading against live prices), renamed and reformulated to a
   single number per `docs/FRONTEND.md` §2.2. Drop the second 600–1400 scale; a score and a
   separately-scaled rating on the same card reads as two competing numbers, not one clear
   signal. **Done**: `MoatBadge` (0–100) is the only score shown anywhere in the UI now; the
   600–1400 rating display and `TierBadge` are fully retired from every route (analyst profile,
   leaderboard, studio, homepage, scoring pages). The engine still derives a legacy `rating` value
   to populate the existing `profiles.rating` column — that's a stored/backend concern, not a UI
   one — but nothing in the UI reads it.

### The seal

The one deliberately bold visual moment in the product. Locking a call triggers a wax-seal/stamp
animation on the call block; the seal stays on the card permanently afterward, with the lock date
set in a ring around it; resolution stamps HIT or MISS the same way. Nowhere else in the product
should reach for this level of visual flourish — see `docs/FRONTEND.md` §1.3–1.5. **This exists**
(`SealStamp`, `LockConfirmModal`) and is wired into `PredictionCard` and the report locking flow.

## Tech stack (do not swap without asking)

- Next.js (App Router) + React 19 + TypeScript, strict mode.
- Tailwind v4 (CSS-first `@theme` in `src/app/globals.css`). No `tailwind.config.js`.
- Supabase: Postgres, Auth, Storage, Row Level Security, scheduled jobs (`pg_cron` + Edge
  Functions).
- TanStack Query for client data fetching/caching.
- Motion (`motion/react`) for animation — mandatory `prefers-reduced-motion` support, especially
  for the seal.
- **Icons: Lucide (`lucide-react`) going forward**, replacing Phosphor. Not an urgent rip-out of
  existing icons, but every new component uses Lucide — matches the restrained line-icon
  direction in `docs/FRONTEND.md` §7.3. Don't end up with both libraries in steady-state.
- Recharts for charts.
- **Money: PayPal**, replacing the simulated wallet/credits system as the real payment rail.
  Partner Referrals API for creator onboarding (PayPal runs KYC itself, which is why there's no
  separate identity-verification step), Orders v2 `platform_fees[]` for one-time report
  purchases, the *multiparty* Subscriptions API for recurring investor-to-analyst billing. Full
  research and rationale in `docs/BACKEND_DATA_CONTRACTS.md`. See migration note below.
- Deploy: Vercel (frontend) + Supabase (backend).

### Money migration note

The existing wallet/credits scaffolding in `src/lib/wallet/` modeled the 90/10 split correctly —
keep that math and keep the ledger discipline (every dollar gets a row). What changes: real money
moves through PayPal (a connected PayPal account per analyst, `platform_fees[]` on each order for
the platform cut) instead of an internal credits balance. Treat this as replacing the payment rail
underneath the same ledger concept, not a rewrite of the earnings model. `/subscriptions` and
`/wallet` already have PayPal-shaped UI (a disabled "Connect PayPal" placeholder) ready for this
to land behind. Full schema TBD in `docs/BACKEND.md`.

## Where things live

```
src/
  app/                 Routes (App Router). Marketing in (marketing)/, app in (app)/.
  components/          UI. ui/ = primitives, charts/, layout/, feature components.
  lib/
    supabase/          Browser + server clients, middleware helper.
    engine/            Scoring engine + market data. Pure, server-side, tested by hand.
    db/                Typed queries + mutations (the only place that talks to Supabase).
    wallet/            Ledger logic (server actions) — see money migration note above.
    design/            cn() helper and shared design tokens in TS.
  hooks/               React Query hooks.
supabase/
  migrations/          SQL schema + RLS. Apply in order.
docs/
  BACKEND.md            Full backend spec — schema, engine, fact-checker, payments. Does not
                         exist yet; see the note at the top of this file.
  FRONTEND.md            Full frontend spec — every page, every component, design system.
  BACKEND_DATA_CONTRACTS.md  Real gaps found while building the frontend, plus the PayPal
                         research. The closest thing to a backend reference until BACKEND.md
                         exists.
design-system/MASTER.md  Deprecated as of this rewrite. Kept as historical reference only —
                          docs/FRONTEND.md is now the single source of truth for tokens and
                          screens. Do not add new decisions here.
scripts/               tsx scripts: seed.ts (demo data), grade.ts (run the engine once).
```

## Naming

- Supply side: **analyst** (not "creator"). Already correct in the codebase — keep it. It fits
  this product better than generic creator-platform language.
- Analyst home base: **Studio** (not "Dashboard"). Already correct — keep it.
- Investor-side content surface: **Discover** (not "Feed"). Already correct — keep it.
- Content unit: **call** for a priced BUY/SELL/short call, **report** for long-form research with
  a call attached. Keep the existing distinction — it's a genuine, useful improvement over
  treating everything as one undifferentiated "report" type.
- The score: **MOAT score**. One number, 0–100. No separate tier/rating scale (see above — not
  yet fully retired in the UI).
- **Routes are unchanged from the existing build.** `docs/FRONTEND.md` was written against a
  `/@handle`-style IA; this repo keeps `/analyst/[handle]`, `/discover`, `/studio`, etc. Map the
  spec's routes onto the existing ones rather than renaming — this avoided conflicting with
  in-flight backend branches and still stands.

## Rules for agents

### Process

1. **Explain changes in plain language.** The founder is not a developer.
2. **Branch before changing.** Never push to `main`. Use `design/<short>` or `feat/<short>`.
3. **Ask before big or ambiguous changes.** Do not guess on scope.
4. **Keep data wiring intact when restyling.** The data layer is `src/lib/db/*`; UI imports from
   there, never calls Supabase directly inside a component.

### Design

5. **Read `docs/FRONTEND.md` before any visual change.** It is the single source of truth for
   tokens, type, color, radii, and components — `design-system/MASTER.md` is deprecated.
6. **Color: six tokens**, not one accent + neutrals. `--ink`, `--paper`, `--verdigris`, `--brass`,
   `--plum`, `--rust`. Verdigris doubles as the "up / hit / fact" signal, rust as "down / miss /
   contradicted" — the same token pair covers fact-check verdicts *and* market direction on
   purpose, so the palette doesn't grow past six named hues. Neutral surfaces/borders/muted text
   are derived from `--ink` and `--paper` at varying opacity, not separate named tokens. Full
   rationale in `docs/FRONTEND.md` §1.4.
7. **Fonts by role:** Fraunces for display/editorial (report headlines, analyst names on profile
   heroes) — replaces Space Grotesk for these uses. IBM Plex Sans for body/UI — replaces Manrope.
   IBM Plex Mono for all numerals, tickers, prices, scores — new; previously numbers used the
   display font too.
8. **No drop shadows for elevation** — unchanged, still correct. Depth comes from surface tints
   and hairline borders. One soft shadow token exists only for floating overlays (menus, modals).
9. **Radii:** cards 12px, buttons/inputs/chips 6px. The seal graphic is the **only** fully
   circular element in the product, deliberately, so "circular" keeps meaning something —
   existing rounded avatars move to the 12px card radius, not full circles. **Already done.**
10. **Zero em-dashes** anywhere user-visible — unchanged, still correct.
11. **The disclosure block cannot accept a theme/branding prop, ever.** Every other surface an
    analyst customizes; this one doesn't. See `docs/FRONTEND.md` §2.3. **Already done.**
12. **No 1:1 messaging between an analyst and a subscriber anywhere in the product.** Public
    surfaces only — reports, and scoped debate threads on opinion-tagged claims. This is a
    deliberate guardrail, not a missing feature.
13. **Motion: follow `docs/MOTION.md` exactly.** Easing/duration tokens, the component-by-component
    table, and the "do NOT animate" list are law, not taste.

### Code quality

13. **`npm run lint` and `npm run typecheck` must pass before committing.**
14. **No narration comments.** Comment only non-obvious intent or constraints.
15. **Server-only secrets** (`SUPABASE_SERVICE_ROLE_KEY`, market-data keys, `CRON_SECRET`, PayPal
    client secret) never appear in client components or `NEXT_PUBLIC_*`.
16. **Money flows** show the buyer cost, the platform fee as its own explicit line, and the net
    amount — every time a dollar figure appears, not just at signup. **Already done** on
    `/wallet`'s earnings breakdown; extend the same pattern anywhere else a dollar figure appears.

## Engine (the differentiator)

Scoring lives in `src/lib/engine/`. Calls lock an entry price server-side at publish time. A
scheduled job pulls the final price + benchmark when a call's timeframe ends, grades it, and
recomputes the analyst's MOAT score. This part of the existing build is already close to the full
spec in substance — win rate (Wilson lower bound), decay-weighted profit factor, alpha vs
benchmark, and a logarithmic sample-size confidence ramp are all implemented
(`src/lib/engine/score.ts`). The main gaps are: the seal/lock UI treatment now exists but the
database-level immutability trigger on locked calls is unverified (needs a `docs/BACKEND.md` to
confirm), and weekend/holiday handling + no-market-data fallback in the grading job are unhandled.
Never trust client-supplied prices.

## Anti-patterns (do not ship)

- AI-purple gradients, neon glows, pure black/white, three identical feature cards.
- Green/red (verdigris/rust) on anything that is not sentiment: fact-check verdicts, market
  direction, hit/miss outcomes. Never generic UI.
- A second accent color anywhere, or a color outside the six-token system.
- Drop shadows used for card elevation.
- Em-dashes in any user-visible string.
- Components calling Supabase directly. Data flows through `src/lib/db/*` only.
- A locked call with no seal treatment — locked and unlocked states must be visually distinct.
- A score and a separate tier/rating both shown as if they're independent signals. (Not yet fully
  cleaned up — see "The trust mechanic" above.)
- The disclosure block restyled per analyst, or collapsed into an accordion.
- Paywalled report bodies reachable via a direct client-side table read — `report_bodies` is
  already RLS-gated for this reason; keep it that way.
- "OnlyFans," dating-app, or other casual-platform comparisons in any user-facing or internal
  copy.
- Running any design-system generator that persists output into this repo (e.g. UI/UX Pro Max
  `--design-system --persist`) — it overwrites the ledger-and-seal system with a generic one.

## Cursor Cloud specific instructions

Durable notes for running Stoa in a Cursor Cloud VM. Standard commands live in `package.json`
scripts and `README.md`; this section only records the non-obvious parts.

### Stack and package manager

- Package manager is **npm** (`package-lock.json` is the only lockfile). The `supabase:*` scripts
  shell out to `pnpm dlx supabase` only as a way to invoke the Supabase CLI; that is not the
  project package manager. Node 20+ (22 works). The update script installs deps (`npm install`).

### Backend (Supabase) is remote, not local

- There is **no local database and Docker is not installed**, so `npm run supabase:start` does not
  work here. The app points at the hosted Supabase project **STOA**
  (`https://cqhenicrfdkbsshyszex.supabase.co`), which is already migrated and seeded.
- The app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key)
  from the environment (`src/lib/supabase/{client,server}.ts`). Next.js picks these up from either
  a gitignored `.env.local` (see `.env.example`) or from injected VM env vars, so no `.env.local`
  is required when those are provided as Cursor secrets. Without them, only the `(marketing)`
  pages render; auth, Discover, profiles, Studio, and wallet stay blank/error.
- `SUPABASE_SERVICE_ROLE_KEY` is the service-role secret used only by the admin client
  (`src/lib/supabase/admin.ts`), i.e. `npm run seed` and `npm run grade`. It is **not** needed to
  run or browse the app, and it is not retrievable via the Supabase MCP; it must be supplied as a
  secret before running seed/grade.

### Running and testing

- Dev server: `npm run dev` (port 3000). The demo backend is already seeded, so sign in works out
  of the box: investor `investor@stoa.demo` / `stoademo123`, analysts `*@stoa.demo` (same
  password), e.g. `marcus_webb`, `priya_raman`.
- Auth route is **`/sign-in`** (and `/sign-up`); there is no `/login`.
- Market data uses Yahoo Finance with no key and falls back to deterministic mock prices; AI
  features (fact-check, compose assist) mock-fall back without `DEEPSEEK_API_KEY`. Neither blocks
  local dev.
- Lint/typecheck/tests/build: see the `lint`, `typecheck`, `test:engine`, `test:valuation`, and
  `build` scripts in `package.json`. There is no single aggregate `test` script.
