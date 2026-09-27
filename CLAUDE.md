# CLAUDE.md

Claude Code: read **[AGENTS.md](./AGENTS.md)** for the full project context, tech stack, file
map, and rules. It is the shared source of truth for every AI agent on this repo (Cursor reads
`AGENTS.md` directly).

Read **[docs/PRODUCT_MODEL.md](./docs/PRODUCT_MODEL.md)** for the current product model — the
video-first content model, the five surfaces, the Card Engine and the lifecycle model. It is the
reference for what Stoa is today.

Before any visual change, read **[docs/FRONTEND.md](./docs/FRONTEND.md)** — every page, every
component, and today's tokens. **The current visual system is being retired** in favour of
**[docs/design/direction-b.html](./docs/design/direction-b.html)**; see the note at the top of
FRONTEND.md.

`docs/BUILD_SPEC.md` is history: it describes a product that has since changed (graded calls,
targets, horizons, the old design). Never treat it as a rule.

Before any backend/structural change, check **[docs/BACKEND.md](./docs/BACKEND.md)** and
[docs/BACKEND_DATA_CONTRACTS.md](./docs/BACKEND_DATA_CONTRACTS.md). Both predate the current
product model and need review against `docs/PRODUCT_MODEL.md`.

Quick reminders:

- Next.js App Router + React 19 + TypeScript + Tailwind v4 + Supabase. No Base44.
- **Video-first content model.** A publication is a video, a brief or a thesis. It may declare
  a **stance**: a ticker and a direction, long, short or hold. One stance per publication, frozen
  once published. Evidence cards and a written thesis are optional enrichment. See
  `docs/PRODUCT_MODEL.md`.
- **Grading is retired (2026-09-24).** Nothing is graded, scored, locked or resolved; there is no
  track record, no score, no seal, no Verdict type, no locked entry price, no target and no
  horizon. Do not rebuild any of it. `predictions` is a read-only archive (migration 0067) until
  it is dropped. `reports.locked_at` only marks the moment of publication.
- **Analysts are followed and paid for their judgement, not scored on it.**
- **Edit markers stay.** The public EDITED marker and its edit log are independent of grading.
- **There is no Discover.** The Feed is the only video discovery surface, it is called Feed, and
  it lives at `/feed`; `/discover` is a permanent redirect. The text mosaic and the video/text
  layout toggle that used to live there are gone. Do not reintroduce a browse-as-text surface:
  scanning the catalogue is Explore's job.
- **No scoring.** No score, rating, rank, percentile, hit rate or leaderboard appears anywhere;
  analysts appear as an avatar and a name (the public profile shows followers and, if the analyst
  opts in, members). Never aggregate analysts into a verdict (no long/short splits, average
  targets or consensus). Placement is driven by the **lifecycle model** (NEW / AVERAGE / RISING /
  TRENDING / POPULAR; only NEW and TRENDING are ever shown).
- **Design: pending replacement.** Today's tokens (six colours on cream paper, brass accent,
  Fraunces display, Plex Sans/Mono, hairline broadsheet rules, zero radius on Today, uppercase
  letterspaced mono labels, ink primaries, 6px/12px corners) are what the code runs on until the
  next batch rewrites them, so use them for changes now; but they are no longer law. Do not
  extend them into new surfaces or refuse a change because it breaks one. What survives: green
  and red are sentiment only (up/down, long/short), never chrome.
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
