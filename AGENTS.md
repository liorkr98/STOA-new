# AGENTS.md — Stoa (Next.js rebuild)

This file is the shared source of truth for AI coding agents. **Cursor** reads `AGENTS.md`
natively; **Claude Code** reads `CLAUDE.md`, which simply points here. Keep both in sync by
editing this file and letting `CLAUDE.md` re-export it.

**Full specs — read before any structural or visual work:**

- `docs/PRODUCT_MODEL.md` — the current product model: the video-first content model, the five
  surfaces, the Card Engine, the lifecycle model. Read this first.
- `docs/BUILD_SPEC.md` — the frontend build spec that this run implemented, and
  `docs/BACKEND_BRIEF.md` — the backend gap list handed to Krisi.
- `docs/BACKEND.md` — schema, RLS, the fact-checker pipeline, payments.
  **Does not exist yet.** No one has supplied the source content for it, so it is not being
  fabricated here. Until it exists, `supabase/migrations/*` and `docs/BACKEND_DATA_CONTRACTS.md`
  (gaps found and PayPal research from the frontend build) are the closest things to a backend
  reference in this repo.
- `docs/FRONTEND.md` — every page, every component, the full design system.

This file is the short version for day-to-day work. Those two are the long version. When they
disagree, the long version wins — update this file to match, don't patch around it.

## What Stoa is

A marketplace where independent financial analysts publish stock research and market commentary
and get paid, with the platform taking 10%. Named after the ancient Athenian Stoa, a public place for debate and
commerce. Tagline: "Think clearly. Invest better."

Publications are **video-first**: the atomic unit is a short analyst video, optionally enriched
with a stance (a ticker and a direction), evidence cards, and a written thesis. Full model in
`docs/PRODUCT_MODEL.md`.

**Grading is retired (2026-09-24).** Nothing is locked as a call, graded, scored or resolved. There
is no seal, no track record, no Track Score and no Verdict type. Do not rebuild any of it. The
`predictions` table is a read-only archive until it is dropped (migration 0067), and its only
remaining read is the fallback for a publication's direction before migration 0065.

**Not a social network.** The value isn't a follow graph — it's a stranger trusting another
stranger's paid opinion. Design and copy should reflect that: the trust surface (the stance, the
disclosure block, the edit marker, the fact-checker) matters more than feed mechanics.

One-line positioning if a pitch needs it: "Seeking Alpha's research model with Patreon's creator
economics and a trust layer neither has." Do not compare Stoa to casual creator platforms.

### Content model — video-first (replaces the old report / call / short-post split)

The atomic unit of a publication is a short analyst **video**. Everything else is optional
enrichment layered on top:

- **Stance** — a ticker (`reports.ticker`) and a direction, long, short or hold
  (`reports.stance`). Frozen with the ticker once published. Never graded.
- **Cards** — a swipeable stack of evidence (the Card Engine; see docs/PRODUCT_MODEL.md).
- **Thesis** — the full written argument.

A publication can be video-only commentary with no stance at all (e.g. "what the Iran escalation
means for crude").

| Type label  | What it is                                                              |
| ----------- | ----------------------------------------------------------------------- |
| **VIDEO**   | Reach people who don't know you. The only type on the Feed and Explore. |
| **BRIEF**   | A short written take for existing followers and subscribers.            |
| **THESIS**  | A full written report. Depth; the strongest route onto Today.           |

Compose is a two-step spine per type (the content with its headline on the same screen, then the
tags) plus a features menu on the publish screen (stance, cards, thesis), with no explanatory copy
on any screen. See `docs/COMPOSE.md`.

Every publication shows a **content badge** of what it contains, e.g. `VIDEO · CARDS` or
`VIDEO · NOTE`. Publications with a ticker show **ticker + direction chips** (the direction only
when there is one); publications without a ticker **anchor on a theme / sector tag** instead
(e.g. `MACRO · OIL & ENERGY`).

Full model: docs/PRODUCT_MODEL.md.

### Trust

**No public scoring, and no private scoring either.** Nothing anywhere shows a score, rating, rank,
percentile, hit rate or leaderboard, and no surface aggregates analysts into a verdict. Placement is
driven by the **lifecycle model** (`src/lib/lifecycle/stages.ts`): NEW / AVERAGE / RISING /
TRENDING / POPULAR, of which only NEW and TRENDING are ever displayed. What a reader can trust is
visible on the piece: the stance, frozen once published; the disclosure block; the EDITED marker
and its public edit log; and the fact-checker's result.

**Fact-check is a feature.** The AI fact-checker is a **pre-publish bonus, never a
gate**: a creator may run it and every claim is classified (fact / unproven / opinion /
contradicted), but publishing never waits for it. It already exists (`src/lib/ai/fact-check.ts`, `reports.fact_check_results`) and the
frontend surfaces it inline (`FactCheckLayer`/`FactCheckedText`, `src/components/report/`). It
improves quality, and it never feeds any ranking.
Still missing on the backend: `char_start`/`char_end` offsets on stored claims, and the
`debate_threads`/`debate_replies` tables — see `docs/BACKEND_DATA_CONTRACTS.md`.

## Tech stack (do not swap without asking)

- Next.js (App Router) + React 19 + TypeScript, strict mode.
- Tailwind v4 (CSS-first `@theme` in `src/app/globals.css`). No `tailwind.config.js`.
- Supabase: Postgres, Auth, Storage, Row Level Security, scheduled jobs (`pg_cron` + Edge
  Functions).
- TanStack Query for client data fetching/caching.
- Motion (`motion/react`) for animation — mandatory `prefers-reduced-motion` support.
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
    engine/            Market data (quotes, candles, fundamentals) and the ticker-metrics refresh.
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
scripts/               tsx scripts: seed-demo.ts / seed.ts (demo data), refresh-ticker-metrics.ts.
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
- Content types: **VIDEO / BRIEF / THESIS** (see the content model above). A publication is a
  video, optionally carrying a stance, cards, and a thesis. The database's `content_type` enum
  still has a `call` value (the retired Verdict); migration 0067 refuses it.
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
7. **Any batch that changes structure — a new flow, a new model, a surface rebuilt — must end
   with a reconciliation pass over the whole affected surface, checking that nothing still
   assumes the old model, and reporting whatever it finds.** This has been missed three times:
   the format tabs survived the guided sequence, the video controls were unreachable after the
   four-types restructure, and the toolbox rail still assumed the old workspace. Each was found
   on the live site rather than before merging.

### Design

5. **Read `docs/FRONTEND.md` before any visual change.** It is the single source of truth for
   tokens, type, color, radii, and components — `design-system/MASTER.md` is deprecated.
6. **Color: six tokens**, not one accent + neutrals. `--ink`, `--paper`, `--verdigris`, `--brass`,
   `--plum`, `--rust`. Green and red (verdigris/rust) are the **only sentiment colors** — up/down,
   long/short, fact/contradicted. Brass (certification, the edit marker) and plum (opinion) are
   non-sentiment accents. Neutral surfaces/borders/muted text derive from `--ink` and `--paper` at varying
   opacity. **Primary buttons are solid ink; navy is reserved for the wordmark.** A verdigris-green
   primary button or accent is a bug, not the design — verdigris appears only as a sentiment
   signal, never as chrome. Full rationale in `docs/FRONTEND.md` §1.4.
7. **Fonts by role:** Fraunces for display/editorial (report headlines, analyst names on profile
   heroes) — replaces Space Grotesk for these uses. IBM Plex Sans for body/UI — replaces Manrope.
   IBM Plex Mono for all numerals, tickers, prices, scores — new; previously numbers used the
   display font too.
8. **No drop shadows for elevation** — unchanged, still correct. Depth comes from surface tints
   and hairline borders. One soft shadow token exists only for floating overlays (menus, modals).
9. **Radii:** cards 12px, buttons/inputs/chips 6px. Rounded avatars use the 12px card radius, not
   full circles.
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

## Market data

Quotes, candles and fundamentals live in `src/lib/engine/market/`; the daily ticker-metrics cron
refreshes cached prices and market caps (`src/lib/engine/refresh-ticker-metrics.ts`) and the
`platform_stats` view. Markets depends on both. Never trust client-supplied prices.

## Anti-patterns (do not ship)

- AI-purple gradients, neon glows, pure black/white, three identical feature cards.
- Green/red (verdigris/rust) on anything that is not sentiment: fact-check verdicts, market
  direction. Never generic UI.
- A second accent color anywhere, or a color outside the six-token system.
- Drop shadows used for card elevation.
- Em-dashes in any user-visible string.
- Components calling Supabase directly. Data flows through `src/lib/db/*` only.
- Any grading, scoring or resolution of a publication, public or private: no seal, no HIT/MISS,
  no track record, no Track Score, no hit rate. Grading was retired on 2026-09-24.
- Any score, rating, rank, percentile or leaderboard, or any aggregate stance (long/short split,
  average target, consensus).
- The disclosure block restyled per analyst, or collapsed into an accordion.
- Paywalled report bodies reachable via a direct client-side table read — `report_bodies` is
  already RLS-gated for this reason; keep it that way.
- Dating-app or other casual creator-platform comparisons in any user-facing or internal copy.
- Running any design-system generator that persists output into this repo (e.g. UI/UX Pro Max
  `--design-system --persist`) — it overwrites the ledger system with a generic one.

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
  (`src/lib/supabase/admin.ts`), i.e. `npm run seed` and `npm run demo:seed`. It is **not** needed to
  run or browse the app, and it is not retrievable via the Supabase MCP; it must be supplied as a
  secret before running a seed.

### Running and testing

- Dev server: `npm run dev` (port 3000). The demo backend is already seeded, so sign in works out
  of the box: investor `investor@stoa.demo` / `stoademo123`, analysts `*@stoa.demo` (same
  password), e.g. `marcus_webb`, `priya_raman`.
- Auth route is **`/sign-in`** (and `/sign-up`); there is no `/login`.
- Market data uses Yahoo Finance with no key and falls back to deterministic mock prices; AI
  features (fact-check, compose assist) mock-fall back without `DEEPSEEK_API_KEY`. Neither blocks
  local dev.
- Lint/typecheck/tests/build: see the `lint`, `typecheck`, `test:*` (valuation, ranking, compose,
  video, pwa, ...), and `build` scripts in `package.json`. There is no single aggregate `test` script.

### PWA

Phone readers Add to Home Screen (Safari / Chrome) and open a standalone window. Manifest is
`src/app/manifest.ts` (`start_url` `/feed`, `display: standalone`). The app-shell worker is
`public/sw.js`: never cache HLS, mp4, Bunny, or `/demo/` clips. Offline is `/offline`.

Google and Apple sign-in, and PayPal return URLs, must stay on the production HTTPS origin
(`…/auth/callback`, `…/settings/payouts`). Configure those same origins in the provider consoles.
Standalone is not a privacy exemption; the cookie banner still applies.
