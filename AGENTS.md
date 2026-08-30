# AGENTS.md — Stoa (Next.js rebuild)

This file is the shared source of truth for AI coding agents. **Cursor** reads `AGENTS.md`
natively; **Claude Code** reads `CLAUDE.md`, which simply points here. Keep both in sync by
editing this file and letting `CLAUDE.md` re-export it.

**Full specs — read before any structural or visual work:**

- `docs/PRODUCT_MODEL.md` — the current product model: the video-first content model, the five
  surfaces, the Card Engine, the lifecycle model, the Track Record Engine. Read this first.
- `docs/BUILD_SPEC.md` — the frontend build spec that this run implemented, and
  `docs/BACKEND_BRIEF.md` — the backend gap list handed to Krisi.
- `docs/BACKEND.md` — schema, RLS, the Track Score engine, the fact-checker pipeline, payments.
  **Does not exist yet.** No one has supplied the source content for it, so it is not being
  fabricated here. Until it exists, `supabase/migrations/*` and `docs/BACKEND_DATA_CONTRACTS.md`
  (gaps found and PayPal research from the frontend build) are the closest things to a backend
  reference in this repo.
- `docs/FRONTEND.md` — every page, every component, the full design system.

This file is the short version for day-to-day work. Those two are the long version. When they
disagree, the long version wins — update this file to match, don't patch around it.

## What Stoa is

A marketplace where independent financial analysts publish stock research and market commentary
and get paid, with the platform taking 10%. Every locked call is permanently on the record and
graded by the market. Named after the ancient Athenian Stoa, a public place for debate and
commerce. Tagline: "Think clearly. Invest better."

Publications are **video-first**: the atomic unit is a short analyst video, optionally enriched
with a locked call, evidence cards, and a written thesis. Full model in `docs/PRODUCT_MODEL.md`.

**Not a social network.** The value isn't a follow graph — it's a stranger trusting another
stranger's paid opinion because the track record is more convincing than any relationship. Design
and copy should reflect that: the trust surface (call block, disclosure block, the visible record
of resolved outcomes) matters more than feed mechanics.

One-line positioning if a pitch needs it: "Seeking Alpha's research model with Patreon's creator
economics and a trust layer neither has." Do not compare Stoa to casual creator platforms.

### Content model — video-first (replaces the old report / call / short-post split)

The atomic unit of a publication is a short analyst **video**. Everything else is optional
enrichment layered on top:

- **Call** — a locked, attested prediction: ticker, direction, target price, horizon. Locked at
  publish and immutable. A call is the ONLY element the Track Record Engine grades.
- **Cards** — a swipeable stack of evidence (the Card Engine; see docs/PRODUCT_MODEL.md).
- **Thesis** — the full written argument.

A publication can be video-only commentary with no call at all (e.g. "what the Iran escalation
means for crude"). Scoring keys off one thing only: **does it carry a locked call.** Commentary is
never graded.

| Type label   | What it is                                              | Graded by the market?     |
| ------------ | ------------------------------------------------------- | ------------------------- |
| **CALL**     | Publication built around a locked call (video + call).  | Yes (has a call)          |
| **RESEARCH** | A full written thesis; may or may not carry a call.     | Only if it carries a call |
| **NOTE**     | Short video / commentary, no call.                      | No                        |

Every publication shows a **content badge** of what it contains, e.g. `VIDEO · CALL · CARDS` or
`VIDEO · NOTE`. Publications with a call show **ticker + direction chips**; publications without a
call **anchor on a theme / sector tag** instead (e.g. `MACRO · OIL & ENERGY`).

Full model: docs/PRODUCT_MODEL.md.

### The trust mechanic — three pillars

1. **Locked and attested entry price.** A call locks its ticker, direction, target price, and
   horizon date at publish, with the entry price attested and enforced immutable at the *database*
   level (a Postgres trigger rejects the UPDATE, not just an app-layer check). See
   `docs/BACKEND.md` §3 once it exists.
2. **Market grading at resolution.** When a call's horizon ends, a scheduled job pulls the final
   price plus benchmark and grades the outcome against the locked entry. Nothing is graded by hand.
3. **A public, permanent, non-transferable record.** Every graded outcome is public, cannot be
   quietly erased, and belongs to the record rather than the account. This is the moat.

**No public scoring.** The engine still computes a 0-100 Track Score internally and it is shown
only to the analyst in their private track record (`/studio/track-record`); nothing public shows
a score, rating, rank, percentile or leaderboard, and no surface aggregates analysts into a
verdict. What is public is the record itself: HIT / MISS / NEAR seals, entry to exit, return and
alpha per call, everywhere a resolved call appears. Placement is driven by the **lifecycle model**
(`src/lib/lifecycle/stages.ts`): NEW / AVERAGE / RISING / TRENDING / POPULAR, of which only NEW
and TRENDING are ever displayed. The scoring *formula* is an open decision (the docs describe a
modified Elo; the shipped engine computes a Wilson / profit-factor / alpha composite), so do not
treat either formula as settled.

**Fact-check is a feature, not a pillar.** The AI fact-checker is a **pre-publish quality gate**:
every claim in a report is classified (fact / unproven / opinion / contradicted) before publish is
enabled. It already exists (`src/lib/ai/fact-check.ts`, `reports.fact_check_results`) and the
frontend surfaces it inline (`FactCheckLayer`/`FactCheckedText`, `src/components/report/`). It
improves quality; it is not one of the three trust pillars, and it never feeds the record.
Still missing on the backend: `char_start`/`char_end` offsets on stored claims, and the
`debate_threads`/`debate_replies` tables — see `docs/BACKEND_DATA_CONTRACTS.md`.

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

- Supply side: **analyst** (not "creator"). Already correct in the codebase — keep it.
- The five surfaces: **Feed** (video-first discovery), **Today** (daily editorial read),
  **Markets** (instrument exploration), **Compose** (the authoring studio), **Profile** (public
  storefront + one private area covering both investor and creator sections). See
  `docs/PRODUCT_MODEL.md`.
- **The Feed lives at `/feed`.** It used to live at `/discover` under the label "Feed"; Discover
  is retired as a surface, a route and a name, and `/discover` is a permanent redirect to `/feed`.
  Today is `/home`; there is no `/today` route. Explore is `/explore`.
- **Watching requires an account.** `/feed` and Explore's watch overlay redirect signed-out
  visitors to sign-in, because streaming is the highest per-view cost in the product. Explore's
  posters, Today, publication pages and profiles stay open; the root's lead clip plays on a
  press, not on arrival. Rationale and the accepted tradeoff: `docs/GROWTH_RESEARCH.md` §6.2.
- **Video is adaptive HLS**, played by `NativeClip` (native on Safari, hls.js elsewhere, loaded
  on demand), with the Bunny iframe as an automatic fallback when a manifest is refused. The
  local demo MP4s are a walkthrough tool behind `STOA_DEMO_CLIPS=1`, never a delivery path.
- Content types: **CALL / RESEARCH / NOTE** (see the content model above). A publication is a
  video, optionally carrying a locked call, cards, and a thesis.
- The score: **Track Score**, internal and private. Never shown publicly; the public sees the
  record (seals, entry to exit, return). The underlying formula is an open decision — see
  `docs/PRODUCT_MODEL.md`.
- **Routes are unchanged from the existing build.** `docs/FRONTEND.md` was written against a
  `/@handle`-style IA; this repo keeps `/analyst/[handle]`, `/feed`, `/studio`, etc. Map the
  spec's routes onto the existing ones rather than renaming — this avoided conflicting with
  in-flight backend branches and still stands.

## Rules for agents

### Process

1. **Explain changes in plain language.** The founder is not a developer. Say what changed and
   why, not code.
2. **Branch before changing.** Never push to `main`. Sync local `main` to `origin/main` and cut a
   fresh `design/<short>` or `feat/<short>` branch before starting.
3. **Show before/after descriptions when changing UI.**
4. **Ask before big or ambiguous changes.** Do not guess on scope, and **do not refactor or
   restructure beyond the specific request.**
5. **When fixing a bug, explain what caused it in plain terms before the fix.**
6. **Keep data wiring intact when restyling.** The data layer is `src/lib/db/*`; UI imports from
   there, never calls Supabase directly inside a component.

### Design

5. **Read `docs/FRONTEND.md` before any visual change.** It is the single source of truth for
   tokens, type, color, radii, and components — `design-system/MASTER.md` is deprecated.
6. **Color: six tokens**, not one accent + neutrals. `--ink`, `--paper`, `--verdigris`, `--brass`,
   `--plum`, `--rust`. Green and red (verdigris/rust) are the **only sentiment colors** — up/down,
   hit/miss, fact/contradicted. Brass (seal/certification) and plum (opinion) are non-sentiment
   accents. Neutral surfaces/borders/muted text derive from `--ink` and `--paper` at varying
   opacity. **Primary buttons are solid ink; navy is reserved for the wordmark.** A verdigris-green
   primary button or accent is a bug, not the design — verdigris appears only as a sentiment
   signal, never as chrome. Full rationale in `docs/FRONTEND.md` §1.4.
7. **Fonts by role:** Fraunces for display/editorial (report headlines, analyst names on profile
   heroes) — replaces Space Grotesk for these uses. IBM Plex Sans for body/UI — replaces Manrope.
   IBM Plex Mono for all numerals, tickers, prices, scores — new; previously numbers used the
   display font too.
8. **No drop shadows for elevation** — unchanged, still correct. Depth comes from surface tints
   and hairline borders. One soft shadow token exists only for floating overlays (menus, modals).
9. **Radii:** cards 12px, buttons/inputs/chips 6px. The seal graphic is the only **ceremonial,
   angled** circle in the product, deliberately. The Score Ring is an upright hairline frame (also
   circular, but static and uncolored), distinct from the seal on purpose. Rounded avatars use the
   12px card radius, not full circles.
10. **Zero em-dashes** anywhere user-visible — unchanged, still correct.
11. **The disclosure block cannot accept a theme/branding prop, ever.** Every other surface an
    analyst customizes; this one doesn't. See `docs/FRONTEND.md` §2.3. **Already done.**
12. **No 1:1 messaging between an analyst and a subscriber anywhere in the product.** Public
    surfaces only — reports, and scoped debate threads on opinion-tagged claims. This is a
    deliberate guardrail, not a missing feature.
13. **Motion: follow `docs/MOTION.md` exactly.** Easing/duration tokens, the component-by-component
    table, and the "do NOT animate" list are law, not taste.

### Code quality

13. **`npm run lint`, `npm run typecheck`, and `npm run build` must all pass before reporting a
    batch done.** Verify every batch.
14. **No narration comments.** Comment only non-obvious intent or constraints.
15. **Server-only secrets** (`SUPABASE_SERVICE_ROLE_KEY`, market-data keys, `CRON_SECRET`, PayPal
    client secret) never appear in client components or `NEXT_PUBLIC_*`.
16. **Money flows** show the buyer cost, the platform fee as its own explicit line, and the net
    amount — every time a dollar figure appears, not just at signup. **Already done** on
    `/wallet`'s earnings breakdown; extend the same pattern anywhere else a dollar figure appears.

## Engine (the differentiator)

Scoring lives in `src/lib/engine/`. Calls lock an entry price server-side at publish time. A
scheduled job pulls the final price + benchmark when a call's timeframe ends, grades it, and
recomputes the analyst's Track Score. What the engine computes today: win rate (Wilson lower
bound), decay-weighted profit factor, alpha vs benchmark, and a logarithmic sample-size confidence
ramp (`src/lib/engine/score.ts`). **Open decision:** this Wilson / profit-factor / alpha composite
is not the same as the modified-Elo model the docs describe — reconciling the two is unresolved
work (see `docs/PRODUCT_MODEL.md`), so do not treat either formula as final. Other gaps: the
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
- Any score, rating, rank, percentile or leaderboard on a public surface, or any aggregate stance
  (long/short split, average target, consensus). Resolved outcomes are evidence; a blended number
  is a verdict.
- The disclosure block restyled per analyst, or collapsed into an accordion.
- Paywalled report bodies reachable via a direct client-side table read — `report_bodies` is
  already RLS-gated for this reason; keep it that way.
- Dating-app or other casual creator-platform comparisons in any user-facing or internal copy.
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
  pages render; auth, the Feed, profiles, Studio, and wallet stay blank/error. The `/dev/*`
  fixture routes (profile, today, explore, feed, compose, landing, markets, ...) render every
  surface with fictional data and are blocked in production by the middleware.
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
