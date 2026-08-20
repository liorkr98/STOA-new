# DESIGN_LANGUAGE.md — Stoa visual language for data surfaces

> Durable reference for the research-platform build (spec v3, Section 2). Authoritative for **how
> every new data surface looks**: backgrounds, the data-visualization palette, density, and the new
> component patterns. It **extends** `docs/FRONTEND.md` (the source of truth for base tokens, type,
> radii, and the seven screens) and the six-token system in `PRODUCT.md`. Where this doc and
> `FRONTEND.md` disagree on a base token, `FRONTEND.md` wins. This doc adds the data-viz vocabulary
> `FRONTEND.md` doesn't yet cover.
>
> `design-system/MASTER.md` carries a short hand-written addendum synced from §2/§3/§6 of this
> file. That addendum points here; this file is the long form.

## The register (do not drift)

"The notary's ledger, not a trading terminal: ink on paper, a seal that makes a claim permanent."
Quiet, dense, credible. Analysts read Bloomberg/Koyfin/spreadsheets daily, so **density is a
feature** — but the surface stays a ledger board, never a dark neon terminal. Everything inherits
the tokens in `globals.css`. **No new base palette.** Creator freedom is bounded (Part B).

## 1. The palette (from `globals.css` — do not invent base colors)

Light theme (`.dark` inverts these; values already in `globals.css`):

| Token | Light hex | Role |
|-------|-----------|------|
| `--ink` | `#14171f` | text, dark surfaces (near-black navy, never pure black) |
| `--paper` | `#eff1ed` | app base background (warm greige) |
| `--surface` | `#f7f8f5` | cards |
| `--surface-2` | `#e6e8e2` | nested/inset panels, dense field backgrounds |
| `--verdigris` | `#2f6e5d` | `--up` · Hit · "Fact" (sentiment only, never chrome) |
| `--brass` | `#855f22` | the seal / certification · "Unproven" |
| `--plum` | `#5b4b6b` | "Opinion" |
| `--rust` | `#a6483c` | `--down` · Miss · "Contradicted" |

Derived (never separately named): `--text-mute` (ink 62%), `--text-faint` (ink 42%), `--border`
(ink 14%), `--border-strong` (ink 28%). `--accent = --ink` (chrome and primary buttons are ink;
navy is reserved for the wordmark); `--up = --verdigris`; `--down = --rust`. **Never pure `#000` /
`#fff`.** A verdigris primary button is a bug, not the design.

## 2. Backgrounds — how each surface reads

Layer by **elevation**, not by inventing colors. App base is `--paper`; cards are `--surface` with
a `1px --border` + `--shadow-card`; nested/inset panels are `--surface-2`.

| Surface | Background | Notes |
|---------|-----------|-------|
| App base | `--paper` | — |
| Cards | `--surface` + 1px `--border` + `--shadow-card` | the only shadow allowed (soft ambient) |
| Nested / inset panels | `--surface-2` | inputs, sub-panels, table zebra if any |
| **Reader (report body)** | plain `--paper` | editorial Fraunces (`.stoa-prose--read`), 68ch, **no texture, no chrome** — the words are the artifact |
| **Storefront (creator page)** | `--paper`, banner may use the theme gradient + creator `--accent` wash | the **one** expressive surface (Part B); content cards still `--surface` |
| Compose canvas | `--paper`, centered measure, drag gutter | side panels `--surface`; data blocks are `--surface` cards with hairline headers |
| **Dashboards / Notebook (dense)** | `--surface-2` field with `--surface` widgets/cards | a quiet "ledger board," not a dark terminal; `.dark` handles dark mode automatically |

**Paper texture** (≤3% opacity SVG fiber/noise over `--paper`): **storefront + seal moments only**.
Gated behind `prefers-reduced-motion`/perf, never under reading text. **Default off** in app/reader.

**`.ledger-card`** (the doubled hairline — border + inset rule) is **reserved for trust-critical
blocks only**: the call/prediction card, disclosures, a **locked** `valuationNode` that drives the
target, and HIT/MISS resolution. **Never ordinary cards** — the double rule must keep meaning
something. (Class defined in `globals.css`.)

## 3. Data-visualization palette (the gap this doc closes)

All chart color is derived **only** from the existing six hues so charts read as Stoa. These scales
live in code at `src/lib/design/chart-theme.ts` — **every chart imports from there**, never
redefines a scale inline.

### 3.1 Semantic (always, never swap)

- Gains / positive → `--up` (verdigris).
- Losses / negative → `--down` (rust).

Direction is meaning, not decoration; it never flips for aesthetics.

### 3.2 Categorical (peer comparison, multi-series, ≤6)

In order: `--verdigris`, `--brass`, `--plum`, `--rust`, then `color-mix(--verdigris 55% + --ink)`
(deep teal), then `color-mix(--brass 60% + --ink)` (bronze). Muted, ledger-like — **no neon**. If a
series set exceeds 6, group/aggregate rather than inventing a 7th hue.

### 3.3 Sequential (single-metric intensity — a heat column)

Paper → verdigris in 5 steps: `color-mix(in oklch, --verdigris X%, --surface)` for
X ∈ {12, 30, 50, 72, 100}.

### 3.4 Diverging (valuation sensitivity grid, bull ↔ bear)

`--rust` → neutral `--surface-2` → `--verdigris`. This maps onto up/down semantics: a "good" cell
is green, a "bad" cell is rust, neutral is the inset field color. Used by the A1 sensitivity heatmap
and the A2 scenario grid.

### 3.5 Axes / grid / numbers

- Gridlines: `--border`, hairline; dashed optional via the `.rule-fade` treatment.
- Axis labels: `--text-faint`. Baseline: `--border-strong`.
- **Every figure renders in `.num`** (IBM Plex Mono, `tabular-nums lining-nums`) so columns align.
- Currency/percent adornments follow the `pricing-panel.tsx` convention.

## 4. Typography in data

- **Fraunces** (`--font-display`): report titles + editorial body **only**.
- **IBM Plex Sans** (`--font-sans`): all UI, labels, axis titles, table headers.
- **IBM Plex Mono** (`.num`): every figure, ticker, price, date, and table cell.
- Eyebrows use `.t-eyebrow` (uppercase, tracked). Keep the `--read` swap so a published report reads
  as it was written.

Never mix families within one headline. Emphasis = weight or italic of the same face.

## 5. Motion

Reuse `docs/MOTION.md` tokens **only** (`--ease-out`, `--dur-1..3`, `--dur-ceremony`). New data
blocks fade in with `.fade-up` (y 8px→0, once on mount — never on scroll, never per data refresh).
The **seal ceremony stays exclusive** to lock/publish and resolution. Everything honors
`prefers-reduced-motion` (already handled globally in `globals.css`). Chart lines animate once on
first mount only; live prices just swap (frequency rule).

## 6. Density (`data-density`)

Analysts expect terminal density on dense surfaces. Add a `data-density="comfortable" | "compact"`
attribute (default `comfortable`), persisted per user in settings.

- **compact** tightens the `--space-*` scale usage and table row height — for dashboards,
  watchlists, screeners, and the `statementNode`.
- The **reader stays editorial** regardless of density; density never touches `.stoa-prose--read`.

Implementation: read the attribute at a layout boundary (e.g. `<div data-density=...>` around dense
surfaces) and let CSS key row-height / padding off `[data-density="compact"]`. No component reads a
JS density flag directly.

## 7. New component patterns

These three are built once and reused everywhere. All sit on the surfaces in §2 and use the scales
in §3.

### 7.1 Data table — `src/components/ui/data-table.tsx`

Hairline rows, sticky header, **right-aligned `.num` cells**, up/down coloring on deltas, a summary
row (avg / median / percentile), grouping, a column chooser, and CSV export. Reused by:
`statementNode`, peer comparison, watchlist, and the screener.

### 7.2 Dashboard widget

A `--surface` card with a hairline title bar, an overflow menu, and drag/resize via `@dnd-kit`.
Reused by creator analytics (`/studio/audience`) and investor dashboards (Part G).

### 7.3 Snippet card (Notebook)

A `--surface` card with a source chip (e.g. `10-K · p.42`), a highlighted quote, tags, and an
"insert into report" action. The atomic unit of the Notebook (Part F).

## 8. Invariants this doc enforces

1. No new base color tokens — everything derives from the six in `globals.css`.
2. Sentiment hues (verdigris/rust) appear only on direction, grade, gain/loss, and sparkline
   strokes — never on generic UI, stat cards, buttons, or backgrounds.
3. All figures render in `.num`.
4. Every chart imports its scales from `src/lib/design/chart-theme.ts`.
5. `.ledger-card` stays reserved for trust-critical blocks.
6. Density toggle is respected; the reader stays editorial.
7. Motion uses only `docs/MOTION.md` tokens and honors reduced-motion.
