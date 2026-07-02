# Stoa Design System — MASTER

Version 2.0. The single source of truth for Stoa. Read this before any visual change. Tokens are
defined in `src/app/globals.css` under `@theme`; do not hardcode values that a token already
covers.

## Design read

The notary's seal, not a trading terminal. Stoa is a public ledger of claims made and outcomes
proven, where nothing can be quietly erased. The design borrows from the world of certified
documents, rubber date-stamps, and ledger books — not from generic "dark mode SaaS" or "editorial"
templates. Every locked call is a permanent, attributable record; the visual language should make
that feel true before a single word is read.

Route names are intentionally unchanged from the original build (`/discover`, `/analyst/[handle]`,
`/studio`, `/report/[id]`, etc.) to avoid conflicting with in-flight backend work. The new design
is applied within the existing information architecture, not a URL rename.

## Color

Six named values, used consistently everywhere, never introduced ad hoc per-page.

| Token          | Hex       | Use                                                              |
| -------------- | --------- | ----------------------------------------------------------------|
| `--ink`        | `#14171F` | Primary text, dark UI surfaces. Near-black navy, not pure black.|
| `--paper`      | `#EFF1ED` | Primary background. Cool sage-gray, not warm cream.             |
| `--verdigris`  | `#2F6E5D` | Brand accent. Also: **Fact** claims, **Hit** outcomes.           |
| `--brass`      | `#B8863B` | Certification accent (the seal itself). Also: **Unproven** claims.|
| `--plum`       | `#5B4B6B` | **Opinion** claims. A distinct hue family, not a shade of fact/unproven.|
| `--rust`       | `#A6483C` | **Contradicted** claims, **Miss** outcomes. Muted brick, not alarm-red.|

Derived tokens (`--surface`, `--surface-2`, `--text-mute`, `--border`, `--up`/`--down`, etc.) live
in `globals.css` and are computed from these six — don't add new named colors without a real
reason tied to one of the six roles above.

**Sentiment rule (strict):** `--up`/`--down` (mapped to verdigris/rust) appear only on direction
tags, grade tags, gain/loss numbers, and chart strokes. Never on generic buttons or decoration.

## Typography

- **Display / editorial:** Fraunces (variable). Report titles, creator display names in profile
  heroes, homepage headline, marketing section headers. Only where the product is being *read* —
  never in UI chrome.
- **UI / body:** IBM Plex Sans. All interface chrome — nav, buttons, labels, form inputs, card
  metadata.
- **Numeric / data:** IBM Plex Mono, tabular figures. Ticker symbols, prices, percentages, MOAT
  scores, timestamps, dates — anything scanned and compared rather than read as prose.
- Type scale (utility classes in `globals.css`): `.t-display`, `.t-h1`, `.t-h2`, `.t-h3`,
  `.t-body`, `.t-body-editorial` (Fraunces, for long-form reading), `.t-meta`, `.t-eyebrow`, `.num`.

## Shape and depth

- Radii: cards `--r-card` (12px), buttons/tags `--r-btn`/`--r-tag` (6px), pills full.
- **The seal is the only fully circular element in the product.** Avatars use `--r-card`, not
  `rounded-full` — reserving true circles for the seal keeps the motif meaningful.
- `--shadow-card` exists for ordinary elevation. **Ledger-card treatment** (`.ledger-card` utility
  — 1px `--ink` border + inset hairline + shadow) is reserved for trust-critical blocks only: the
  call block (`PredictionCard`), `DisclosureBlock`, `MoatBadge` (lg), confirmation modals. Never
  use it for ordinary content cards — a double-ruled border should keep meaning something.

## Motion

- UI interactions: 150–250ms, custom ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`). Never `ease-in`
  on entering elements. Buttons get `active:scale-[0.97-0.98]` press feedback.
- Popovers scale in from their trigger (`transform-origin`, see `.popover-content` utility and
  Radix's `--radix-popover-content-transform-origin`). Modals stay centered — they're exempt.
- Never animate from `scale(0)`. Start from `scale(0.9)`+ with opacity.
- **The seal-stamp animation is the one deliberately ceremonial moment in the product** (`.seal-
  press`/`.seal-ink-bleed`, ~400ms, in `SealStamp`): press + slight rotate + ink-bleed on lock.
  Everything else stays quiet so this one moment lands. Under `prefers-reduced-motion`, it becomes
  an instant state-swap, not a faded-down animation.
- `prefers-reduced-motion` is handled globally in `globals.css`.

## Core components (canonical, reuse — do not reinvent)

- `Button` — `src/components/ui/button.tsx`. Variants: `primary`, `secondary`, `ghost`, `subtle`.
  Already has correct press feedback; rarely needs touching.
- `Avatar` — `src/components/ui/avatar.tsx`. Card-radius, not circular.
- `Tag` / `DirectionTag` / `GradeTag` — `src/components/ui/tag.tsx`.
- `SealStamp` — `src/components/ui/seal-stamp.tsx`. The signature motif: `locked`/`hit`/`miss`
  states, embossed date ring, lock animation. `sm`/`md`/`lg`.
- `MoatBadge` — `src/components/ui/moat-badge.tsx`. Wraps `profiles.score`/`rating`/`tier` (the
  existing 0-100 engine score — no new schema). Links to `/@[handle]/moat`. `sm`/`md`/`lg`, with a
  provisional-score note under a small sample size.
- `StatusChip` — `src/components/ui/status-chip.tsx`. `draft`/`open`/`hit`/`miss`, icon + label.
- `DisclosureBlock` — `src/components/ui/disclosure-block.tsx`. Fixed 3-row ledger card. **Never
  accepts a theme/color prop** — the one component creators cannot restyle.
- `PaywallGate` — `src/components/ui/paywall-gate.tsx`. Wraps report body only; accepts real
  `BuyReportButton`/`SubscribeButton` as slots.
- `LockConfirmModal` — `src/components/ui/lock-confirm-modal.tsx`. Radix Dialog. The seal ritual.
- `FactCheckLayer` / `FactCheckedText` — `src/components/report/fact-check-layer.tsx`. Summary
  strip + inline underlined claim annotations with origin-aware Radix popovers. Adapts the
  existing `FactClaim`/`ClaimType` data (`src/lib/ai/fact-check.ts`) to the 4-value verdict
  taxonomy (fact/unproven/opinion/contradicted) client-side — no schema change needed.
- `DebateThread` — `src/components/report/debate-thread.tsx`. Side panel (desktop) / bottom sheet
  (mobile), scoped to one opinion claim. Not persisted yet — see `docs/BACKEND_DATA_CONTRACTS.md`.
- `RoleSwitcher` — `src/components/layout/role-switcher.tsx`. Only renders when an account has
  both investor and creator capability; schema doesn't support that yet, so it's currently always
  hidden by design, not broken.
- `PredictionCard` — `src/components/prediction-card.tsx`. The investment card. Now `ledger-card`
  styled, with a `SealStamp` beside the target price.
- `TierBadge`, `Stat`, `AnalystCard`, `ScoreRing` — unchanged in behavior, inherit new tokens
  automatically.
- Layout: `TopNav` (now includes conditional `RoleSwitcher`) and `StudioSidebar`.

## Legacy dialogs (migration in progress)

`confirm-spend-dialog.tsx`, `subscribe-button.tsx`, and `buy-report-button.tsx` still use a
hand-rolled Motion-based dialog (manual Escape listener, no real focus trap). `LockConfirmModal`
and `DebateThread` use Radix Dialog instead, for real accessibility guarantees. Migrate the
legacy three to Radix when touched next, so there's one dialog pattern in the codebase, not two.

## Screens

| Screen   | Route                | Purpose                                                          |
| -------- | --------------------- | ------------------------------------------------------------------------ |
| Landing  | `/`                   | Public marketing. Hero, track-record proof, scoring mechanics, leaderboard.|
| Discover | `/discover`           | Investor feed.                                                    |
| Markets  | `/markets`             | Ticker browser.                                                   |
| Profile  | `/analyst/[handle]`   | The creator's public surface, with `MoatBadge` (lg) and ledger archive.  |
| Report   | `/report/[id]`        | Long-form reading view. `FactCheckLayer` + `PaywallGate` + comments.     |
| Studio   | `/studio`              | Creator home base.                                                |
| Compose  | `/studio/compose`     | Block editor. Fact-check panel feeds `FactCheckLayer` on publish.        |

## Anti-patterns (do not ship)

- AI-purple gradients, neon glows, glassmorphism, pure black/white, three identical feature cards.
- A second accent hue outside the six named tokens.
- `ledger-card` treatment on ordinary content — reserve it for trust-critical blocks.
- Full circles anywhere except the seal.
- Green/red (raw) on anything that is not market sentiment — use `--verdigris`/`--rust` via the
  semantic tokens, which already carry the correct meaning in this palette.
- Em-dashes in any user-visible string.
- Components calling Supabase directly. Data flows through `src/lib/db/*` only.
- Introducing Lucide icons alongside the existing Phosphor set — pick one icon language and keep it.
