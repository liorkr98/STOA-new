# CLAUDE.md

Claude Code: read **[AGENTS.md](./AGENTS.md)** for the full project context, tech stack, file
map, and rules. It is the shared source of truth for every AI agent on this repo (Cursor reads
`AGENTS.md` directly).

Before any visual change, also read **[design-system/MASTER.md](./design-system/MASTER.md)**.

Quick reminders:

- Next.js App Router + React 19 + TypeScript + Tailwind v4 + Supabase. No Base44.
- Ledger/notary palette: ink, paper, verdigris, brass, plum, rust. Green/red sentiment is expressed
  via verdigris/rust, never raw hex.
- Fraunces for display/editorial, IBM Plex Sans for UI, IBM Plex Mono for numerals.
- The seal (`SealStamp`) is the only fully circular element in the product.
- The data layer in `src/lib/db/*` is the only place that talks to Supabase.
- `npm run lint` and `npm run typecheck` must pass. No narration comments. Zero em-dashes.
