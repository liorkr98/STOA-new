---
name: stoa-design-system
description: Stoa's visual language for any UI or data surface. Use this skill when building or restyling any Stoa screen, chart, table, dashboard, editor block, or storefront element - it encodes the six-token palette, surface/elevation rules, the data-visualization scales, density model, and the reserved trust treatments so generated UI stays on-brand.
license: proprietary
metadata:
  author: Stoa
  version: "1.0.0"
  organization: Stoa
  abstract: The tokens, backgrounds, data-viz scales, density model, and component patterns that keep every generated Stoa surface on the ledger-and-seal register. Pointer skill; the durable specs it references are the source of truth.
---

# Stoa Design System

The notary's ledger, not a trading terminal: ink on paper, a seal that makes a claim permanent.
Quiet, dense, credible. This skill is the always-loaded pointer; the source of truth is:

- `docs/FRONTEND.md` — base tokens, type, radii, the seven screens (wins on base tokens).
- `docs/DESIGN_LANGUAGE.md` — backgrounds, data-viz palette, density, component patterns (wins on
  data-viz).
- `design-system/MASTER.md` — short reference + v3 data-viz addendum.
- `docs/MOTION.md` — motion tokens and the component-by-component table (wins on motion).

**Read the relevant doc before a visual change.** This skill summarizes; the docs decide.

## Non-negotiables

1. **Six color tokens only** (`--ink`, `--paper`, `--verdigris`, `--brass`, `--plum`, `--rust`).
   Neutrals are opacity-derived from ink over paper. **Never invent a base color; never a second
   accent; never pure #000/#fff.** No literal hex in components — use CSS vars.
2. **Sentiment hues are restricted.** Verdigris/rust (and `--up`/`--down`) appear only on: direction
   tags, grade tags (Hit/Near/Partial/Miss/Open), gain/loss figures, and sparkline/chart strokes.
   Never on generic UI, stat cards, buttons, backgrounds, or borders.
3. **Fonts by role.** Fraunces = display + editorial only. IBM Plex Sans = all UI/labels. IBM Plex
   Mono (`.num`, tabular) = every figure, ticker, price, date, table cell.
4. **Radii:** cards 12px (`--r-card`), buttons/inputs/chips 6px (`--r-btn`/`--r-tag`). The seal is
   the only fully circular element in the product.
5. **No drop shadows for elevation.** Depth = surface tint + 1px hairline. `--shadow-card` is the
   only soft ambient shadow (cards/overlays).
6. **Zero em-dashes** in any user-visible string.

## Backgrounds (elevation, not new colors)

App base `--paper` → cards `--surface` + 1px `--border` → nested panels `--surface-2`. Reader body
is plain `--paper`, editorial, no texture, 68ch. Storefront is the one expressive surface. Dense
surfaces (dashboards, Notebook, screener) use a `--surface-2` field with `--surface` widgets — a
ledger board, never a dark terminal.

`.ledger-card` (doubled hairline) is **reserved**: call/prediction card, disclosures, a locked
`valuationNode` that drives the target, HIT/MISS resolution. Never ordinary cards.

## Data visualization

**Import every scale from `src/lib/design/chart-theme.ts`** — never redefine inline.

- Semantic: positive `--up`, negative `--down` (never swapped).
- Categorical ≤6: verdigris, brass, plum, rust, deep teal, bronze (`chartTheme.categorical`).
- Sequential: paper→verdigris 5 steps (`chartTheme.sequential`).
- Diverging: rust→neutral→verdigris (`chartTheme.diverging(t)`), for sensitivity/scenario grids.
- Axes: `--border` grid, `--text-faint` labels, `--border-strong` baseline (`chartTheme.axis`).
- All figures in `.num`.

## Density

`data-density="comfortable" | "compact"` (default comfortable), persisted per user. Compact tightens
spacing + row height on dashboards, watchlists, screeners, statement block. Reader stays editorial.

## Component patterns (build once, reuse)

- `src/components/ui/data-table.tsx` — hairline rows, sticky header, right-aligned `.num`, up/down
  deltas, summary row (avg/median/percentile), grouping, column chooser, CSV export.
- Dashboard widget — `--surface` card, hairline title, overflow menu, `@dnd-kit` drag/resize.
- Snippet card (Notebook) — `--surface` card, source chip, quote, tags, insert-into-report action.

## Motion

Only `docs/MOTION.md` tokens (`--ease-out`, `--dur-1..3`, `--dur-ceremony`). New data blocks
`.fade-up` once on mount. The seal ceremony is exclusive to lock/publish + resolution. Charts
animate once on first mount; live prices just swap. `prefers-reduced-motion` always honored.

## Anti-patterns (fail review)

AI-purple gradients, neon, glassmorphism, gamified badges; a second accent; literal hex in a
component; verdigris/rust on non-sentiment UI; drop-shadow elevation; a circle that isn't the seal;
`border-radius` > 12px on cards or > 6px on buttons; a chart with an inline color scale; a locked
call without seal treatment; the disclosure block restyled per analyst. **Never run a design-system
generator that persists into this repo.**
