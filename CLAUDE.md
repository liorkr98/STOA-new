# CLAUDE.md

Claude Code: read **[AGENTS.md](./AGENTS.md)** for the full project context, tech stack, file
map, and rules. It is the shared source of truth for every AI agent on this repo (Cursor reads
`AGENTS.md` directly).

Read **[docs/PRODUCT_MODEL.md](./docs/PRODUCT_MODEL.md)** for the current product model — the
video-first content model, the five surfaces, the Card Engine and the lifecycle model. It is the
reference for what Stoa is today.

Before any visual change, read **[docs/FRONTEND.md](./docs/FRONTEND.md)** — the design system,
every page, every component, and the single source of truth for tokens.

Before any backend/structural change, check **[docs/BACKEND.md](./docs/BACKEND.md)** and
[docs/BACKEND_DATA_CONTRACTS.md](./docs/BACKEND_DATA_CONTRACTS.md). Both predate the current
product model and need review against `docs/PRODUCT_MODEL.md`.

Quick reminders:

- Next.js App Router + React 19 + TypeScript + Tailwind v4 + Supabase. No Base44.
- **Video-first content model.** The atomic unit of a publication is a short analyst video; a
  stance (ticker and direction), evidence cards, and a written thesis are optional enrichment.
  Three types: video, brief, thesis. See `docs/PRODUCT_MODEL.md`.
- **Grading is retired (2026-09-24).** Nothing is graded, scored or resolved; there is no seal,
  track record, Track Score or Verdict type. Do not rebuild any of it. `predictions` is a
  read-only archive (migration 0067) until it is dropped.
- **There is no Discover.** The Feed is the only video discovery surface, it is called Feed, and
  it lives at `/feed`; `/discover` is a permanent redirect. The text mosaic and the video/text
  layout toggle that used to live there are gone. Do not reintroduce a browse-as-text surface:
  scanning the catalogue is Explore's job.
- **No scoring.** No score, rating, rank, percentile, hit rate or leaderboard appears anywhere;
  analysts appear as an avatar and a name (the public profile shows followers and, if the analyst
  opts in, members). Never aggregate analysts into a verdict (no long/short splits, average
  targets or consensus). Placement is driven by the **lifecycle model** (NEW / AVERAGE / RISING /
  TRENDING / POPULAR; only NEW and TRENDING are ever shown).
- Ledger/notary palette: six tokens — ink, paper, verdigris, brass, plum, rust. Green and red
  (verdigris/rust) are the only **sentiment** colors (up/down, long/short); brass and plum are
  non-sentiment accents. **Primary buttons are solid ink; navy is reserved for the wordmark.** A
  verdigris-green primary button is a bug, not the design.
- Fraunces for display/editorial, IBM Plex Sans for UI, IBM Plex Mono for numerals.
- Money is PayPal, not Stripe — Partner Referrals for onboarding, Orders v2 `platform_fees[]` for
  one-time purchases, multiparty Subscriptions for recurring billing.
- Icons: Lucide going forward for new components; existing Phosphor usage isn't an urgent
  rip-out, but don't add more of it.
- The data layer in `src/lib/db/*` is the only place that talks to Supabase.
- `npm run lint`, `npm run typecheck`, and `npm run build` must pass. No narration comments. Zero
  em-dashes.
- **Any batch that changes structure — a new flow, a new model, a surface rebuilt — must end with
  a reconciliation pass over the whole affected surface, checking that nothing still assumes the
  old model, and reporting whatever it finds.** This has been missed three times: the format tabs
  survived the guided sequence, the video controls were unreachable after the four-types
  restructure, and the toolbox rail still assumed the old workspace. Each was found on the live
  site rather than before merging. (Rule 7 under Process in `AGENTS.md`.)
