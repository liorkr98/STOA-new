# AGENTS.md — Stoa (Next.js rebuild)

This file is the shared source of truth for AI coding agents. **Cursor** reads `AGENTS.md`
natively; **Claude Code** reads `CLAUDE.md`, which simply points here. Keep both in sync by
editing this file and letting `CLAUDE.md` re-export it.

## What Stoa is

A two-sided marketplace where independent financial analysts publish stock research and retail
investors pay for it. Think OnlyFans for stock-market analysis. Named after the ancient Athenian
Stoa, a public place for debate and commerce. Tagline: "Think clearly. Invest better."

- Analysts publish research, BUY/SELL calls, and short posts. They set their own pricing
  (monthly subscription or pay-per-report).
- Every call (ticker, direction, target, timeframe) is logged and auto-scored into a **public,
  permanent, non-transferable track record**. This is the core moat.
- The platform takes a 10% cut. All money is in USD.

### Three content types

| Type            | Description                                  | Feeds track record? |
| --------------- | -------------------------------------------- | ------------------- |
| Research report | Long-form analysis with an investment card.  | Yes                 |
| BUY/SELL call   | Short call with an investment card only.     | Yes                 |
| Short post      | Commentary / news reaction. No card.         | No                  |

## Tech stack (do not swap without asking)

- **Next.js (App Router)** + **React 19** + **TypeScript**, strict mode.
- **Tailwind v4** (CSS-first `@theme` in `src/app/globals.css`). No `tailwind.config.js`.
- **Supabase** for Postgres, Auth, Storage, Row Level Security, and scheduled jobs. This
  replaces the old Base44 backend entirely. There is no Base44 code in this repo.
- **TanStack Query** for client data fetching/caching.
- **Motion** (`motion/react`) for animation. **Phosphor** (`@phosphor-icons/react`) for icons.
- **Recharts** for charts.
- Deploy: **Vercel** (frontend) + **Supabase** (backend).

## Where things live

```
src/
  app/                 Routes (App Router). Marketing in (marketing)/, app in (app)/.
  components/          UI. ui/ = primitives, charts/, layout/, feature components.
  lib/
    supabase/          Browser + server clients, middleware helper.
    engine/            Scoring engine + market data. Pure, server-side, tested by hand.
    db/                Typed queries + mutations (the only place that talks to Supabase).
    wallet/            Simulated wallet / credits logic (server actions).
    design/            cn() helper and shared design tokens in TS.
  hooks/               React Query hooks.
supabase/
  migrations/          SQL schema + RLS. Apply in order.
  seed.sql             Optional SQL seed.
scripts/               tsx scripts: seed.ts (demo data), grade.ts (run the engine once).
design-system/MASTER.md  The visual contract. Read before any UI change.
```

## Rules for agents

### Process

1. **Explain changes in plain language.** The founder (Bar) is not a developer.
2. **Branch before changing.** Never push to `main`. Use `design/<short>` or `feat/<short>`.
3. **Ask before big or ambiguous changes.** Do not guess on scope.
4. **Keep data wiring intact when restyling.** The data layer is `src/lib/db/*`; UI imports from
   there, never calls Supabase directly inside a component.

### Design

5. **Read `design-system/MASTER.md` before any visual change.** It is the single source of truth
   for tokens, type, color, radii, and components.
6. **One accent color** (`--accent`, a signal blue). Green/red are reserved strictly for market
   sentiment (price direction, gain/loss, grade tags). Never use green/red for generic UI.
7. **Fonts by role:** Space Grotesk for display headlines and all numbers; Manrope for body and UI.
8. **No drop shadows for elevation.** Depth comes from hairline borders and surface tints.
9. **Radii:** cards 12px, buttons 8px, tags/pills full or 6px. Pick from the token scale; do not
   invent values.
10. **Zero em-dashes** anywhere user-visible. Use a hyphen or restructure.

### Code quality

11. **`npm run lint` and `npm run typecheck` must pass before committing.**
12. **No narration comments.** Comment only non-obvious intent or constraints.
13. **Server-only secrets** (`SUPABASE_SERVICE_ROLE_KEY`, market-data keys, `CRON_SECRET`) never
    appear in client components or `NEXT_PUBLIC_*`.
14. **Money flows** show the buyer cost, balance, new balance, and the 90/10 split before spending.

## Engine (the differentiator)

Scoring lives in `src/lib/engine/`. Calls lock an entry price server-side at publish time. A
scheduled job pulls the final price + S&P benchmark when a call's timeframe ends, grades it, and
recomputes the analyst's score and tier. See `design-system/MASTER.md` and the engine README
comments for the math. Never trust client-supplied prices.
