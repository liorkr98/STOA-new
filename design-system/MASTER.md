# Stoa Design System — MASTER

Version 1.0. The single source of truth for the Stoa Next rebuild. Read this before any visual
change. Tokens are defined in `src/app/globals.css` under `@theme`; do not hardcode values that a
token already covers.

## Design read

Trust-first fintech marketplace for retail investors and independent analysts. Sharp,
editorial-data language: confident type, mono numerals, generous structure, restrained motion.
It must feel credible (people pay real money) and premium (analysts want to be seen here).

Dials: VARIANCE 6, MOTION 4, DENSITY 5. Light is the default theme; a dark theme ships alongside it.

## Color

One accent. Neutrals are a cool slate ramp. Sentiment colors are restricted.

| Token             | Light        | Dark         | Use                                                |
| ----------------- | ------------ | ------------ | -------------------------------------------------- |
| `--bg`            | `#fbfbfc`    | `#0c0d10`    | Page background                                    |
| `--surface`       | `#ffffff`    | `#15171c`    | Cards, panels                                      |
| `--surface-2`     | `#f4f5f7`    | `#1c1f26`    | Inset / secondary surfaces                         |
| `--text`          | `#16181d`    | `#f3f4f6`    | Primary text                                       |
| `--text-mute`     | `#5b6270`    | `#9aa3b2`    | Secondary text, labels                             |
| `--text-faint`    | `#8b919e`    | `#6b7280`    | Tertiary, captions                                 |
| `--border`        | `#e7e9ee`    | `#262a33`    | Hairline borders (used at 1px, low contrast)       |
| `--border-strong` | `#d3d7df`    | `#363b46`    | Hover / focus borders                              |
| `--accent`        | `#2f5fff`    | `#5a82ff`    | The one brand accent. Signal blue.                 |
| `--accent-weak`   | `#eaeeff`    | `#1b2240`    | Accent tint backgrounds                            |
| `--up`            | `#0f9d6b`    | `#34d39e`    | Sentiment: gains, long, hit                        |
| `--down`          | `#e0483d`    | `#ff6b5e`    | Sentiment: losses, short, miss                     |

**Sentiment rule (strict):** `--up` / `--down` appear only on direction tags (Long/Short), grade
tags (Hit/Near/Partial/Miss/Open), gain/loss numbers, and chart strokes. Never on buttons,
backgrounds, generic borders, or decoration.

**Accent lock:** `--accent` is the only accent on the whole product. Do not introduce a second
hue for a CTA or badge.

## Typography

- **Display + numbers:** Space Grotesk. Headlines use tight tracking. All numerals, tickers,
  prices, scores, and percentages use it via the `.num` / `font-mono` utility for tabular figures.
- **Body + UI:** Manrope. Paragraphs, labels, navigation, buttons, inputs.
- Type scale (utility classes in `globals.css`): `.t-display`, `.t-h1`, `.t-h2`, `.t-h3`,
  `.t-body`, `.t-meta`, `.t-eyebrow`. Body copy maxes at `65ch`.
- Emphasis inside a headline uses weight or italic of the same family. Never mix a serif word
  into a sans headline.

## Shape and depth

- Radii: cards `--r-card` (12px), buttons `--r-btn` (8px), tags `--r-tag` (6px), pills full.
  Pick from the scale; do not invent values.
- No drop shadows for elevation. Depth comes from `--surface` tint changes and 1px `--border`
  hairlines. A single soft ambient shadow token (`--shadow-soft`) exists only for floating
  overlays (menus, modals, toasts).
- Borders are 1px. Use `--border` by default, `--border-strong` on hover/focus.

## Motion (intensity 4)

- Entry: short fade + 8-16px rise, `ease: [0.16, 1, 0.3, 1]`, 0.4-0.6s. Stagger lists by ~0.05s.
- Hover: `translateY(-1px)` on cards, `scale(0.98)` on `:active` for buttons.
- Everything above intensity 3 honors `prefers-reduced-motion` via `useReducedMotion()`.
- Motion must be motivated (hierarchy, feedback, state). No infinite loops for decoration.

## Core components (canonical, reuse — do not reinvent)

- `Button` — `src/components/ui/button.tsx`. Variants: `primary` (accent fill), `secondary`
  (surface + border), `ghost`, `subtle`. Sizes `sm | md | lg`. One line of label, max 3 words.
- `Card` / `Surface` — `src/components/ui/card.tsx`. The base panel.
- `Tag` — `src/components/ui/tag.tsx`. Variants for direction (`long`/`short`/`hold`) and grade
  (`hit`/`near`/`partial`/`miss`/`open`). These are the only place sentiment color appears as a tag.
- `Avatar` — `src/components/ui/avatar.tsx`. Sizes `sm | md | lg | xl`.
- `Stat` — `src/components/ui/stat.tsx`. A labeled number block (mono).
- `TierBadge` — `src/components/ui/tier-badge.tsx`. Renders the engine tier.
- `Sparkline` / `TrackChart` — `src/components/charts/`. Sentiment-stroked.
- `PredictionCard` — `src/components/prediction-card.tsx`. The investment card. The signature object.
- `AnalystCard` — `src/components/analyst-card.tsx`. Browse/Discover unit.
- `ScoreRing` — `src/components/score-ring.tsx`. The 0-100 analyst score dial.
- Layout: `TopNav` (investor pages) and `StudioSidebar` (analyst Studio) in `components/layout/`.

## Screens

| Screen   | Route                         | Purpose                                          |
| -------- | ----------------------------- | ------------------------------------------------ |
| Landing  | `/`                           | Public marketing. Asymmetric hero + live track.  |
| Discover | `/discover`                   | Investor feed (Trending / Following / Subs).     |
| Markets  | `/markets`                    | Ticker browser with the Stoa coverage badge.     |
| Profile  | `/analyst/[handle]`           | The analyst's public surface. The hero of Stoa.  |
| Report   | `/report/[id]`                | Long-form reading view + comments.               |
| Studio   | `/studio`                     | Analyst home base (Overview / Audience / Earn).  |
| Compose  | `/studio/compose`             | Full-bleed block editor.                         |

## Anti-patterns (do not ship)

- AI-purple gradients, neon glows, pure black/white, three identical feature cards.
- Green/red on anything that is not market sentiment.
- A second accent color anywhere.
- Drop shadows used for card elevation.
- Em-dashes in any user-visible string.
- Components calling Supabase directly. Data flows through `src/lib/db/*` only.
