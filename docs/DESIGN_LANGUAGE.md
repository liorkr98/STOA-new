# DESIGN_LANGUAGE.md: Stoa's visual law

> **Current system: Direction B (adopted 2026-09-27).** The reference is
> [`docs/design/direction-b.html`](./design/direction-b.html). Take the look from it, not the
> product: its sample screens predate the grading removal and still show a Verdict type, HIT/MISS
> chips and a Receipts tab. None of that exists (see `AGENTS.md`).
>
> This file is the law: colour, type, shape, and the rules that keep them honest.
> `docs/FRONTEND.md` is the map: which component and token to reach for, and what each surface
> still carries from the old system. Where the two disagree, this file wins.
>
> The tokens live in `src/app/globals.css`. `npm run test:contrast` (run in CI) enforces the
> contrast rule, the accent-safe utilities, the label law, mono-for-tickers and the retired
> tokens. A change that breaks it breaks the build.

## The register

Editorial confidence. Black, white and grey carry about 90% of the interface. One coral marks the
thing you can act on. Green and red say which way something is pointing. Type is large, heavy and
tight at the top of the page, calm and readable underneath. Shapes are round.

## 1. Colour

### 1.1 The palette

| Token | Light | Dark | Role |
|---|---|---|---|
| `--paper` | `#FAFAFA` | `#0F1216` | the page |
| `--surface` | `#FFFFFF` | `#171B20` | cards |
| `--surface-2` | `#F2F3F5` | `#1D2127` | sunk wells, chip and field backgrounds |
| `--ink` / `--text` | `#101418` | `#F3F4F6` | words, ink buttons |
| `--text-mute` | `#5B6470` | `#A0A8B3` | secondary words, meta lines |
| `--text-faint` | `#8A919B` | `#6E7681` | **decoration only**: rules, ornaments. Never words |
| `--border` | `#E6E8EB` | `#2A2F36` | hairlines |
| `--border-strong` | `#C9CED4` | `#3D434B` | emphasised edges, hover edges |
| `--coral` | `#FF5A47` | `#FF5A47` | coral **fills** |
| `--coral-text` | `#C8321F` | `#FF7A6A` | coral **words** |
| `--gain` | `#12B981` | `#12B981` | gain **fills** |
| `--gain-text` (= `--up`) | `#087A55` | `#34D399` | gain **words** |
| `--loss` | `#E5484D` | `#E5484D` | loss **fills** |
| `--loss-text` (= `--down`) | `#C92A31` | `#F87171` | loss **words** |
| `--on-coral`, `--on-gain`, `--on-loss` | `#101418` | `#101418` | the ink that sits on a fill |

Paper, card and well are literal values on the same cool axis. Move one and you must move the
others: a warm card on a cool page reads as a mistake.

### 1.2 THE CONTRAST RULE

Every coloured hue has two tones, one for fills and one for words, and they are not
interchangeable.

1. **Coloured words use the `-text` tone.** Bright coral is 3.1:1 on white and fails as small
   text; deep coral is 5.3:1. Same for gain and loss. In Tailwind: `text-coral`, `text-gain`,
   `text-loss` (they resolve to the `-text` tones).
2. **Fills carry black text.** White on coral is 3.1:1 and fails; black on coral is 6.0:1. In
   Tailwind, `bg-coral`, `bg-gain` and `bg-loss` set the black ink themselves, so a fill cannot be
   written without it.
3. **Every word clears 4.5:1** on paper, card and well, in both themes. Faint grey (3.2:1) is
   never a word.

This is encoded, not just written down. Coral, gain and loss are deliberately not `--color-*`
theme entries, so there is no `bg-coral/50`, `text-[var(--coral)]` or `ring-coral/20` to reach for
by accident. `test:contrast` measures every pair in both themes and scans for white text on a
fill, bright tones used as words, and faint grey used as a word.

Error crimson: 6.6 on paper, 6.2 on its error box; dark 7.9 on paper.

Measured (light, then dark): ink on paper 17.7 / 17.1; muted on paper 5.75, on the dark card 7.2;
deep coral on paper 5.1 and on the well 4.8, light coral on the dark well 6.4; gain text on paper
5.1, on the dark well 8.4; loss text on paper 5.2, on the dark well 5.8; black on coral 6.0, on
gain 7.3, on loss 4.7.

### 1.3 THE ACCENT LAW

- **Coral marks the live or actionable thing, and nothing else**: Subscribe, Follow, Publish, the
  one primary action on a screen, a live recording. At most one coral fill per view; when two
  candidates meet (Subscribe beside Follow on a profile) the lesser one goes ghost. A list of
  small follow pills uses the coral outline, not the fill.
- **The fresh-post ring** is the one coral that is not a control: on Today's row of faces a coral
  ring marks an analyst with something the reader has not seen: posted since the reader last
  looked, and not watched through since. It is live information about a person, drawn as a ring
  (`.today-ring`), never a fill or a word.
- **Green and red carry direction (long / short) and price movement, nothing else.** Not
  success, not error, not "saved", not approve/reject, not a chart series that is not a price.
- **THE ERROR EXCEPTION (decided by Bar, 2026-09-27).** A failed payment or a rejected form must
  not read as neutral, so errors are red: `--error`, a crimson (`#B0164F` light, `#FF7FA8`
  dark) deliberately held away from the price red (`--loss-text` `#C92A31`), so an error can
  never pass for a price move. It is used only for error messages, failed states and destructive
  hovers, with `--error-soft` / `--error-edge` for error boxes. Never for success, never for
  price. `test:contrast` fails if it drifts within 15 degrees of hue of the loss red.
- **Everything else is black, white and grey.** Confirmations, pending states, notices, the
  edited marker, highlights, chart series and selection resolve to ink and grey through their
  own meaning tokens (`--ok`, `--pending`, `--notice-*`, `--mark-edited`, `--highlight`,
  `--chart-1..3`), split by meaning so any one of them can change in one place.
- `--accent` is **ink**, despite the name: the filled ink button, selected tabs, the selection
  highlight. It must never be repointed at coral. The creator storefront may tint `--accent`;
  it cannot change coral.

## 2. Type

### 2.1 Faces

| Face | Token | Use |
|---|---|---|
| Bricolage Grotesque 700 / 800 | `--font-display` | display, headline, title |
| Inter 400 / 500 / 600 / 700 | `--font-sans` | reading and UI; tabular figures on everywhere |
| JetBrains Mono 500 / 600 | `--font-mono` | **tickers only** |
| Heebo 400 to 800 | second in both stacks | Hebrew, which none of the three above contains |

Hebrew: the beta is Israel-first. Heebo is a neutral grotesque that goes to 800, so a Hebrew
headline keeps its weight beside a Bricolage one. The Latin faces load with
`adjustFontFallback: false` on purpose: next/font's metric-matched fallback is a copy of Arial,
which contains Hebrew and would catch every Hebrew character before Heebo. (Before 2026-09-27 this
is exactly what happened: Hebrew headlines drew in Times New Roman and Hebrew body text in Arial.)

### 2.2 Six sizes

| Size | Value | Face | Tailwind | Class |
|---|---|---|---|---|
| display | 40 to 72px | Bricolage 800, -0.045em | `text-display` | `.t-display` |
| headline | 24 to 32px | Bricolage 800, -0.03em | `text-headline` | `.t-headline` |
| title | 19px | Bricolage 700, -0.015em | `text-title` | `.t-title` |
| body | 15px | Inter | `text-body` | `.t-body`, `.t-body-editorial` |
| ticker | 13px | JetBrains Mono on a ticker; Inter for captions, chips, meta | `text-ticker` | `.t-meta`, `.t-ticker` |
| reading | 17 to 18px, line 1.75 | Inter | `text-reading` | `.stoa-prose` |

**Reading is the sixth size and it earns its place in one spot only:** the report body and the
Compose editor, where someone reads or writes for ten minutes. Both render through `.stoa-prose`
(the published reader adds `.stoa-prose--read`, which only drops the drag gutter), so a report
reads at the size it was written. `test:contrast` fails if `text-reading` appears anywhere else.
Report headings inside the body use Bricolage (headline and title sizes).

There is no seventh size. Tailwind's own scale (`text-xs` to `text-9xl`) is deleted in
`globals.css`, so `text-sm` or `text-[11px]` simply do nothing. The ticker step doubles as the
caption size: small words are 13px Inter, and only a ticker symbol is mono.

### 2.3 Labels

**No uppercase, no letterspacing, anywhere.** Section labels are sentence-case words in muted
Inter or a Section heading. Positive tracking is gone; negative tracking belongs to the display
sizes. Figures are Inter with tabular numerals (`.num`, and on by default on `body`), not mono.

## 3. Shape

Rounded, never square. Radius is split **by role**; never borrow another role's radius.

| Token | Value | Tailwind | For |
|---|---|---|---|
| `--r-button` | pill | `rounded-button` | buttons and button-like links, segmented controls |
| `--r-chip` | pill | `rounded-chip` | ticker, stance and quiet chips |
| `--r-field` | 10px | `rounded-field` | inputs, textareas, selects, search boxes |
| `--r-panel` | 14px | `rounded-panel` | cards, menus, popovers, dialogs, media frames |
| `--r-inner` | 8px | `rounded-inner` | wells, list rows, option tiles and thumbnails inside a panel |
| `--r-avatar` | 50% | `rounded-avatar` | faces. Always circles |

A tall, multi-line "button" (an option tile, a type card) takes `inner` or `panel`, not a pill.

## 4. Primitives

Surfaces inherit these rather than rolling their own. All in `src/components/ui/`.

- **Button** (`button.tsx`): `ink` (default), `ghost` (outlined), `coral` (the action),
  `plain` (text), `subtle` (grey well). Sizes `sm` 32, `md` 40, `lg` 48. `buttonClass()` gives
  the same recipe to a `Link` or a raw element that cannot be a `<Button>`.
- **Chip** (`chip.tsx`): `TickerChip` (mono), `StanceChip` (long / short in the gain or loss text
  tone with a ▲ / ▼, hold quiet), `ThemeChip`, and the quiet `Chip`.
- **Card** (`card.tsx`): white on paper, hairline, panel radius. `as` renders a section, li or
  fieldset; `cardClass` for elements that cannot be a Card.
- **Avatar** (`avatar.tsx`): a circle, named sizes 22 / 28 / 40 / 56 / 88 or an exact pixel size.
- **SectionHeading** (`section-heading.tsx`): headline, optional note, optional "See all". `Band`
  renders one.

## 5. Data visualisation

Every chart imports its scales from `src/lib/design/chart-theme.ts`.

- Price up / down: `--up` / `--down` (the text tones: a thin line in the bright fill falls under
  3:1). Area fills may use the same hue at low alpha.
- Categorical series: `--chart-1` (ink), `--chart-2` (muted), `--chart-3` (faint), then ink mixed
  towards the surface. No hues: colour is for direction and action.
- Sequential: surface to ink in five steps. Diverging: `--loss` to the well to `--gain`, because
  a sensitivity grid is about gain and loss.
- Axis labels: `--text-mute`, 13px Inter (`canvasFont()` resolves the real family for canvas).
  Gridlines: `--border`.
- Canvas charts cannot read CSS; they call `canvasColor()` and `canvasFont()` from
  `src/lib/design/canvas-color.ts` at draw time.

## 6. Backgrounds and elevation

Paper for the page, white cards with a hairline, the well for inset panels and fields. One soft
shadow (`--shadow-card`) for things that float. No paper texture outside the creator storefront,
never under reading text. `.ledger-card` (the doubled hairline) stays reserved for trust-critical
blocks (the disclosure block).

## 7. Motion and density

Motion uses `docs/MOTION.md` tokens only and honours reduced motion. `data-density="compact"`
tightens dense surfaces; the reader stays editorial regardless.

## 8. Places tokens cannot reach

These hold literal copies of the tokens and must be updated by hand when a token changes:

| Where | File |
|---|---|
| Browser bar colour (light and dark) | `src/app/layout.tsx` (`themeColor`) |
| App manifest | `src/app/manifest.ts` |
| PWA and Apple icons | `src/lib/pwa/icon-response.tsx` (bump `CACHE` in `public/sw.js` when they change) |
| Ticker share image | `src/app/api/og/stock/route.tsx` (fonts fetched by name in `src/lib/seo/og-fonts.ts`) |
| Storefront accent checker | `src/lib/profile/accent.ts` (`PAPER_LIGHT` / `PAPER_DARK`; the test checks they match) |
| TradingView embed | `src/components/shared/TradingViewChart/TradingViewChart.tsx` |
| Chart fallbacks | `price-chart.tsx`, `card-chart.tsx` (used only if a token fails to resolve) |
| Email templates | `docs/email-templates/*.html` (pasted into Supabase by hand) |

## 9. Invariants

1. No base colour is invented per surface. New meanings get a meaning token that resolves to an
   existing value.
2. Coral only on the live or actionable thing; green and red only on direction and price.
3. Coloured words use `-text` tones; fills carry black ink; every word clears 4.5:1. Errors use
   the crimson `--error`, never the price red.
4. Six sizes (reading only in `.stoa-prose`), three faces, Heebo for Hebrew, mono for tickers only, no uppercase labels.
5. Radius by role; avatars are circles.
6. Every chart imports `chart-theme.ts`.
7. `npm run test:contrast` passes.
