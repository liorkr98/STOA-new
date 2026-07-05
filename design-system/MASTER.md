# Stoa Design System — MASTER

**Deprecated as of this rewrite.** `docs/FRONTEND.md` is now the single source of truth for
tokens, type, color, radii, screens, and components. This file is kept only as a short reference
agents can check without opening the full doc — if the two ever disagree, `docs/FRONTEND.md`
wins and this file should be corrected to match.

## Design read

Not a fintech dashboard. A public ledger of claims made and outcomes proven — the material world
of notary seals, rubber date-stamps, and certified documents, not a trading terminal. It has to
feel credible (real money changes hands) without borrowing trading-app visual cliches:
candlestick-green gradients, gamified badges, glassmorphism, neon.

Dials: VARIANCE 6, MOTION 3 (the seal moment is the deliberate exception — see below), DENSITY 5.
Investors here read Bloomberg/TipRanks/spreadsheets daily — don't over-simplify into oversized
consumer-app cards with excess white space. Light is the default theme; dark ships alongside it,
same token-mapping approach as before.

## Color — six named tokens, not neutrals-plus-one-accent

| Token         | Hex       | Use                                                                 |
| ------------- | --------- | -------------------------------------------------------------------- |
| `--ink`       | `#14171F` | Primary text, dark surfaces. Near-black navy, not pure black.        |
| `--paper`     | `#EFF1ED` | Primary background. Cool sage-gray, not warm cream.                  |
| `--verdigris` | `#2F6E5D` | Primary brand accent. **Also**: fact-check "Fact," call outcome "Hit," market direction "up." |
| `--brass`     | `#B8863B` | The seal/certification color. **Also**: fact-check "Unproven."       |
| `--plum`      | `#5B4B6B` | Fact-check "Opinion" — deliberately a different hue family from fact/unproven, not a shade of either. |
| `--rust`      | `#A6483C` | Fact-check "Contradicted." **Also**: call outcome "Miss," market direction "down." |

**Why verdigris/rust cover both fact-check verdicts and market sentiment:** both encode the same
underlying idea — "this is trending toward being right" vs. "this is trending toward being
wrong" — so reusing the pair keeps the palette at six tokens instead of growing a separate
up/down pair that would mean almost the same thing as fact/contradicted. One color system, not
two running in parallel.

**Neutrals are derived, not separately named.** Borders, muted text, inset surfaces: all
opacity-derived from `--ink` over `--paper` (e.g., a border is `--ink` at ~8% opacity, muted text
is `--ink` at ~60%). Don't introduce new named neutral tokens — derive what you need from the six.

**Accent lock, still true:** nothing outside these six hues, ever. No second accent for a CTA or
badge.

## Typography — three roles

- **Display / editorial:** Fraunces (variable, wght 600–680). Report headlines, analyst display
  names on profile heroes, homepage headline. Replaces Space Grotesk for these uses.
- **UI / body:** IBM Plex Sans. Interface chrome, body copy, buttons, labels, navigation.
  Replaces Manrope.
- **Numeric / data:** IBM Plex Mono, tabular figures. Tickers, prices, percentages, MOAT scores,
  dates, timestamps — anything meant to be scanned and compared rather than read as prose. This
  is new; numerals previously shared the display face.
- Body copy maxes at 65ch, unchanged from v1.
- Emphasis inside a headline uses weight or italic of the same family. Never mix families within
  one headline.

## Shape and depth

- Two radii only: `--radius-sm` (6px — inputs, buttons, chips) and `--radius-md` (12px — cards,
  avatars). Down from the old three-value scale (12/8/6) — one less decision to make per
  component, and it makes the seal's full-circle shape actually stand out as the only circular
  element in the product.
- No drop shadows for elevation — unchanged, still correct. Depth comes from `--paper`/surface
  tint changes and 1px hairline borders. One soft ambient shadow token exists only for floating
  overlays (menus, modals, toasts) — same as before.
- Trust-critical cards (the call block, the disclosure block) get a doubled hairline border — two
  close parallel rules, evoking a ledger entry box — reserved specifically for information that
  must never be visually mistaken for ordinary content. This is new.

## Motion

- **The seal ceremony is the one orchestrated moment in the product**, intensity above the
  MOTION 3 dial on purpose: press-scale (0.96→1.0) + ~8° rotation settle + radial ink-bleed fade,
  ~400ms, ease-out. Fires when a call is locked; a second stamp (Hit/Miss) plays the same way at
  resolution.
- Everything else stays at or below the MOTION 3 dial: fast quiet 150–200ms hover/focus
  transitions, simple content fades. No scroll-triggered reveals, no staggered card entrances, no
  parallax, no infinite decorative loops — restraint everywhere else is what makes the seal land
  as the one memorable moment instead of one of many.
- `prefers-reduced-motion` mandatory everywhere, especially the seal — it becomes an instant
  state-swap (unlocked card → locked card with seal already present) rather than an animation.

## Core components (canonical, reuse — do not reinvent)

Existing components, kept and repurposed:
- `Button` (`src/components/ui/button.tsx`) — variants and sizing unchanged.
- `Card` / `Surface` (`src/components/ui/card.tsx`) — base panel, unchanged.
- `Avatar` (`src/components/ui/avatar.tsx`) — now renders at `--radius-md`, never full circle
  (the seal is the only circle in the product now).
- `Sparkline` / `TrackChart` (`src/components/charts/`) — restyle strokes to verdigris/rust
  instead of a generic green/red pair, consistent with the token table above.
- `AnalystCard` (`src/components/analyst-card.tsx`) — keep the name and role; swap its score
  display for the new `MoatBadge`.
- `TopNav` / `StudioSidebar` (`src/components/layout/`) — keep structurally; add a role-switcher
  pill to `TopNav` if an account can be both analyst and investor (`docs/FRONTEND.md` §2.1).

Existing components, renamed or redefined:
- `PredictionCard` → becomes the **call block** ledger-card. Same job (ticker, direction,
  target), redefined to add the seal icon once locked (with the lock date set in a ring around
  it) and to sit beside — never merged with — the new disclosure block.
- `ScoreRing` → becomes the visual base for `MoatBadge`. One number, 0–100, color-mapped by the
  token table: below 40 renders in `--rust`, 40–69 in `--brass`, 70–100 in `--verdigris`.
- `TierBadge` → **retired.** A score and a separately-scaled tier/rating on the same card reads
  as two competing numbers. MOAT score is the only number now.

New components — don't exist yet, build per `docs/FRONTEND.md` §2:
- `DisclosureBlock` — position held, compensation certification, "these are my own views." Fixed
  layout, never restyled per analyst.
- `PaywallGate` — wraps report bodies only, never the call block or disclosure block.
- `LockConfirmModal` — triggers the seal animation on confirm.
- `SealStamp` — the actual seal asset as its own component (`status: locked | hit | miss`, plus
  the lock/resolution date), built once and reused everywhere rather than redrawn per usage.
- `FactCheckLayer` — inline claim annotation (fact/unproven/opinion/contradicted underlines +
  popovers) wrapping report body text.
- `DebateThread` — scoped comment thread on a single opinion-tagged claim, not a general comment
  section.
- `StatusChip` — Open / Resolution pending / Resolved·Hit / Resolved·Miss / Draft, always icon +
  label, never color-only.

## Screens

Existing routes, unchanged:

| Screen   | Route               | Purpose                                         |
| -------- | -------------------- | -------------------------------------------------- |
| Landing  | `/`                   | Public marketing. Trust bar + how-it-works, not just a hero. |
| Discover | `/discover`           | Investor feed (Trending / Following / Subscribed).   |
| Markets  | `/markets`            | Ticker browser.                                       |
| Profile  | `/analyst/[handle]`   | The analyst's public surface. Hero of the product.    |
| Report   | `/report/[id]`        | Long-form reading view — now with the fact-check layer and the always-visible trust sidebar (call block, disclosure block, MOAT badge). |
| Studio   | `/studio`              | Analyst home base.                                    |
| Compose  | `/studio/compose`      | Full-bleed block editor — now with the pre-publish fact-check panel and lock confirmation flow. |

Missing routes to add, per `docs/FRONTEND.md` Parts 4–6 (route paths below are illustrative of
the spec's IA; this build keeps existing route names, e.g. `/studio/analytics` rather than
`/dashboard/analytics` — see `AGENTS.md`'s Naming section):

| Screen              | Route                        |
| -------------------- | ------------------------------ |
| Onboarding (investor) | `/onboarding/investor` — **done** |
| Onboarding (analyst)  | `/onboarding/analyst/*` (brand → price → first-report — Verify step dropped, PayPal handles KYC during its own onboarding rather than exposing a separate identity-verification product) — **done** |
| Following             | `/following`                  |
| Watchlist             | `/watchlist` — **done**       |
| Notifications          | covered by existing `/inbox`, extended with day-grouping — **done** |
| Billing                | covered by existing `/subscriptions`, extended with payment method + purchase history — **done** |
| Account                | `/settings/account`           |
| MOAT Analytics         | `/analyst/[handle]/moat` — **done** |
| Audience                | `/studio/audience`            |
| Earnings & Payouts      | covered by existing `/wallet`, extended with gross/fee/net breakdown + payout status — **done** |
| Branding studio         | `/studio/branding`            |
| Pricing                 | folded into the analyst onboarding wizard's Price step (`/onboarding/analyst/price`) — **done**; `/become-analyst` now redirects into the wizard rather than a separate single-screen form |

## Anti-patterns (do not ship)

- AI-purple gradients, neon glows, pure black/white, three identical feature cards.
- Verdigris/rust on anything that is not a fact-check verdict, a call outcome, or market
  direction. Never generic UI.
- A second accent color anywhere, or any color outside the six-token system.
- Drop shadows used for card elevation.
- Em-dashes in any user-visible string.
- Components calling Supabase directly. Data flows through `src/lib/db/*` only.
- A locked call rendered with no visual distinction from a draft — the seal is mandatory the
  moment `locked_at` is set.
- A score shown alongside a separately-scaled tier/rating, as if they're two different signals.
- The disclosure block restyled per analyst, collapsed into an accordion, or hidden behind a tab.
- A fully circular element anywhere except the seal.

---

## v3 addendum — data-visualization canon

**Hand-written, synced from `docs/DESIGN_LANGUAGE.md` §2/§3/§6.** Not generator output. This is the
one place new decisions were added to this deprecated file, because the data-viz vocabulary is
genuinely new and agents check MASTER.md as the short reference. The long form (and the tie-breaker
if the two disagree) is `docs/DESIGN_LANGUAGE.md`; base tokens still defer to `docs/FRONTEND.md`.

### Backgrounds (§2.2)

Layer by elevation, not new colors: app base `--paper`; cards `--surface` + 1px `--border`; nested
panels `--surface-2`. Reader body is plain `--paper`, editorial, no texture. Storefront is the one
expressive surface (banner may use theme gradient + creator `--accent` wash). Dashboards/Notebook
are dense: `--surface-2` field with `--surface` widgets. `.ledger-card` (doubled hairline) stays
reserved for trust-critical blocks only (call card, disclosures, a locked `valuationNode` that
drives the target, HIT/MISS). Optional paper texture (≤3%) is storefront + seal moments only,
default off.

### Data-viz palette (§2.3) — derived only from the six hues; import from `src/lib/design/chart-theme.ts`

- **Semantic (always):** positive = `--up` (verdigris), negative = `--down` (rust). Never swap.
- **Categorical (≤6):** `--verdigris`, `--brass`, `--plum`, `--rust`,
  `color-mix(--verdigris 55% + --ink)`, `color-mix(--brass 60% + --ink)`. Muted, no neon.
- **Sequential:** paper → verdigris, 5 steps via `color-mix(in oklch, --verdigris X%, --surface)`.
- **Diverging (sensitivity/scenario):** `--rust` → `--surface-2` → `--verdigris`.
- **Axes/grid:** `--border` lines, `--text-faint` labels, `--border-strong` baseline.
- **Numbers:** always `.num` (tabular Plex Mono).

### Density (§2.6)

`data-density="comfortable" | "compact"` (default comfortable), persisted per user. Compact tightens
spacing + table row height for dashboards, watchlists, screeners, and the statement block. The
reader stays editorial regardless.
