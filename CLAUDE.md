# CLAUDE.md

Claude Code: read **[AGENTS.md](./AGENTS.md)** for the full project context, tech stack, file
map, and rules. It is the shared source of truth for every AI agent on this repo (Cursor reads
`AGENTS.md` directly).

Read **[docs/PRODUCT_MODEL.md](./docs/PRODUCT_MODEL.md)** for the current product model — the
video-first content model, the five surfaces, the Card Engine, the lifecycle model, and the
Track Record Engine (private, not publicly scored). It is the reference for what Stoa is today.

Before any visual change, read **[docs/FRONTEND.md](./docs/FRONTEND.md)** — the design system,
every page, every component, and the single source of truth for tokens.

Before any backend/structural change, check **[docs/BACKEND.md](./docs/BACKEND.md)** and
[docs/BACKEND_DATA_CONTRACTS.md](./docs/BACKEND_DATA_CONTRACTS.md). Both predate the current
product model and need review against `docs/PRODUCT_MODEL.md`.

Quick reminders:

- Next.js App Router + React 19 + TypeScript + Tailwind v4 + Supabase. No Base44.
- **Video-first content model.** The atomic unit of a publication is a short analyst video; a
  locked call, evidence cards, and a written thesis are optional enrichment. Only publications
  with a locked call are scored. See `docs/PRODUCT_MODEL.md`.
- **No public scoring.** No score, rating, rank, percentile or leaderboard appears anywhere
  public; analysts appear as an avatar and a name (the public profile shows followers and, if the
  analyst opts in, members). The Track Record Engine still runs and records still accrue; resolved
  outcomes (HIT / MISS / NEAR seals, entry to exit, return) stay visible everywhere as evidence.
  Never aggregate analysts into a verdict (no long/short splits, average targets or consensus).
  Placement is driven by the **lifecycle model** (NEW / AVERAGE / RISING / TRENDING / POPULAR;
  only NEW and TRENDING are ever shown). The scoring formula remains an open internal decision
  (docs describe a modified Elo; the engine computes a Wilson / profit-factor / alpha composite).
- Ledger/notary palette: six tokens — ink, paper, verdigris, brass, plum, rust. Green and red
  (verdigris/rust) are the only **sentiment** colors (up/down, hit/miss); brass and plum are
  non-sentiment accents. **Primary buttons are solid ink; navy is reserved for the wordmark.** A
  verdigris-green primary button is a bug, not the design.
- Fraunces for display/editorial, IBM Plex Sans for UI, IBM Plex Mono for numerals.
- The seal (`SealStamp`) is the only **ceremonial, angled** circle in the product. The Score Ring
  survives only in the analyst's private track record; it never appears publicly.
- Money is PayPal, not Stripe — Partner Referrals for onboarding, Orders v2 `platform_fees[]` for
  one-time purchases, multiparty Subscriptions for recurring billing.
- Icons: Lucide going forward for new components; existing Phosphor usage isn't an urgent
  rip-out, but don't add more of it.
- The data layer in `src/lib/db/*` is the only place that talks to Supabase.
- `npm run lint`, `npm run typecheck`, and `npm run build` must pass. No narration comments. Zero
  em-dashes.
