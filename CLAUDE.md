# CLAUDE.md

Claude Code: read **[AGENTS.md](./AGENTS.md)** for the full project context, tech stack, file
map, and rules. It is the shared source of truth for every AI agent on this repo (Cursor reads
`AGENTS.md` directly).

Before any visual change, read **[docs/FRONTEND.md](./docs/FRONTEND.md)** — the full design
system, every page, every component. `design-system/MASTER.md` is deprecated; kept only as a
short pointer.

Before any backend/structural change, check **[docs/BACKEND.md](./docs/BACKEND.md)** — this file
does not exist yet (no source content has been supplied for it). Until it does,
[docs/BACKEND_DATA_CONTRACTS.md](./docs/BACKEND_DATA_CONTRACTS.md) has the real gaps found while
building the frontend, plus the PayPal integration research.

Quick reminders:

- Next.js App Router + React 19 + TypeScript + Tailwind v4 + Supabase. No Base44.
- Ledger/notary palette: ink, paper, verdigris, brass, plum, rust. Green/red sentiment is
  expressed via verdigris/rust, never raw hex.
- Fraunces for display/editorial, IBM Plex Sans for UI, IBM Plex Mono for numerals.
- The seal (`SealStamp`) is the only fully circular element in the product.
- Money is PayPal, not Stripe — Partner Referrals for onboarding, Orders v2 `platform_fees[]` for
  one-time purchases, multiparty Subscriptions for recurring billing.
- Icons: Lucide going forward for new components; existing Phosphor usage isn't an urgent
  rip-out, but don't add more of it.
- The score is **MOAT score** (0–100) only — the 600–1400 rating and `TierBadge` are being
  retired, not finished yet.
- The data layer in `src/lib/db/*` is the only place that talks to Supabase.
- `npm run lint` and `npm run typecheck` must pass. No narration comments. Zero em-dashes.
