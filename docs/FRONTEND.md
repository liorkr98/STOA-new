# Stoa — Frontend & Design Deep Dive

The full frontend specification. `AGENTS.md` is the short version for day-to-day work; when the
two disagree, this file wins and `AGENTS.md` should be corrected to match.

**Two adaptations from the original spec, both deliberate:**
- **Payments are PayPal, not Stripe.** Everywhere this doc originally said Stripe Identity /
  Stripe Express, read PayPal instead: Partner Referrals API for seller onboarding (handles KYC
  itself, which is why there's no separate identity-verification onboarding step), Orders v2
  `platform_fees[]` for the 10% cut, and the *multiparty* Subscriptions API for recurring
  investor-to-analyst billing. Full research and rationale in `docs/BACKEND_DATA_CONTRACTS.md`.
- **Route names are unchanged from the existing build**, not renamed to the `/@handle`-style
  paths this doc originally used. `/analyst/[handle]` stays `/analyst/[handle]` (not `/@handle`),
  `/discover` stays `/discover` (not `/feed`), `/studio` stays `/studio` (not `/dashboard`), etc.
  This avoided conflicting with in-flight backend branches. The design system, components, and
  page content below apply within the existing URLs.

Assumes the backend contract in `docs/BACKEND.md` (schema, RLS, the Track Score formula, the
fact-checker pipeline). Nothing here invents new data — every field referenced below should
already exist in that schema, or is flagged explicitly where it doesn't yet.

---

## PART 1 — DESIGN PHILOSOPHY

### 1.1 What this product cannot look like

Three visual directions currently dominate AI-assisted and templated design work, and Stoa should
land on none of them by default:

- Warm cream background + high-contrast serif + terracotta accent (generic "editorial" template)
- Near-black background + single neon/acid accent (generic "dark mode SaaS" template)
- Broadsheet hairline-rule newspaper layout with zero border-radius (generic "serious
  publication" template)

All three are legitimate ingredients, but none of them are *specific to Stoa* — they'd be equally
at home on a recipe blog or a crypto dashboard. The design needs to come from what Stoa actually
is: **a public ledger of claims made and outcomes proven, where nothing can be quietly erased.**

### 1.2 Where the design comes from

The real-world material for this brief isn't "fintech app" — it's **the notary's seal, the
rubber date-stamp, the ledger book, the certified document.** Every one of those objects exists
to do one thing: make a claim permanent and attributable. That's exactly what a locked price
target is. The design should feel like it borrows from that world, not from a trading terminal or
a social feed.

### 1.3 The signature element: The Seal

This is the one deliberately bold, memorable device in the product, and everything else stays
quiet around it.

- **At the moment of locking:** when a creator clicks "Lock it in" on a price target, a circular
  stamp graphic presses down onto the call block — a brief press + slight rotate + ink-bleed
  animation (~400ms, see §2.5 for motion spec, fully respects `prefers-reduced-motion`). This is
  the one moment in the entire product allowed to feel ceremonial, because it's the one action
  that's genuinely irreversible.
- **After locking:** a small embossed seal icon sits permanently beside the locked target price,
  with the lock date set in a ring around its edge (like a coin or a postmark). This becomes the
  recurring visual proof, everywhere a locked call appears — feed cards, profile archives, the
  report page itself — that *this specific number, on this specific date, cannot be changed.*
- **At resolution:** a second stamp overlays the first — "HIT" stamped in the verdigris ink
  color, or "MISS" stamped in the rust ink color, set at a slight rotation like a librarian's
  due-date stamp. This is the moment that makes the whole trust mechanic visible and satisfying:
  the reader watches an open, unresolved claim become a permanent, provable record.

Nowhere else in the product should reach for this level of visual flourish. Buttons are plain.
Cards are quiet. The seal is the one thing people will remember and describe to someone else —
"you lock a call and it gets stamped" — which is exactly the kind of concrete, ownable detail
that makes a product describable in one sentence.

### 1.4 Design token system

**Color — six named values, used consistently everywhere, never introduced ad hoc per-page:**

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#14171F` | Primary text, dark UI surfaces. A near-black navy, not pure black — pure black against the paper tone below reads harsh under long reading sessions. |
| `--paper` | `#FAF8F4` | Primary background. A warm, light ledger-paper neutral. Warmed from the original cool sage-gray `#EFF1ED`, which read grey-green rather than like paper. The warmth is held low and the value high, so this stays aged-ledger, not the saturated cream of an AI-design default. |
| `--verdigris` | `#2F6E5D` | Primary brand accent. Deep patinated-bronze green — the color of old bank stamps and aged copper. Doubles as the semantic color for **Fact** claims and **Hit** outcomes. |
| `--brass` | `#855F22` | Certification accent — deep antique brass, used for the seal graphic itself and for **Unproven** claims (things pending verification, same visual family as "not yet certified"). Darkened from `#B8863B` (2.84:1, failed C.2 rule 8) to clear 4.5:1 on paper and surface-2 as meaning-bearing text. |
| `--plum` | `#5B4B6B` | Semantic color for **Opinion** claims — a claim that's debatable belongs in a different hue family entirely from fact/unproven, not a lighter or darker version of them. |
| `--rust` | `#A6483C` | Semantic color for **Contradicted** claims and **Miss** outcomes. Muted brick, not alarm-red — this should read as "this didn't hold up," not "danger." |

Every one of these is used at **low-saturation, high-legibility values** — this is not a bright,
gamified palette. Fact-check underlines and stamps use these at full value; backgrounds, chips,
and badges use 8–12% tints of the same hues rather than introducing new pastels.

**Neutral surfaces sit on the `--paper` axis.** Text, borders, and muted tones are `color-mix`
derivations of `--ink` over `--paper`, so they re-tune themselves whenever paper moves. Two
neutrals are *not* derived and must be moved by hand alongside `--paper`: `--surface` (`#FFFDF9`,
the raised card, one step lighter than paper) and `--surface-2` (`#F1ECE3`, the recessed chip
tint, one step darker). If paper changes and these two do not, cards lose their separation from
the page and drift off-hue.

**Typography — three roles, never blended:**

| Role | Typeface | Used for |
|---|---|---|
| Display / editorial | **Fraunces** (variable, wght 600–680, high optical size for headlines) | Report titles, creator display names in profile heroes, homepage headline, section headers on marketing pages. This is the "editorial voice" — it should only appear where the product is being *read*, never in UI chrome. |
| UI / body | **IBM Plex Sans** | All interface chrome — nav labels, buttons, form labels, body copy in settings/dashboards, card metadata. |
| Numeric / data | **IBM Plex Mono**, tabular figures enabled | Ticker symbols, prices, percentages, dates, Track Scores, timestamps — anything that needs to be *scanned and compared* rather than read as prose. Plex Sans and Plex Mono are drawn as a coherent system, which is why they're paired rather than mixing a generic sans with a generic mono. |

Type scale (rem, 16px base):

```
--text-micro: 10px              — mono eyebrows / uppercase-tracked labels only (never prose)
--text-mini:  11px              — mono metadata inside dense data cards only (never prose)
--text-xs:    0.75rem   (12px)  — timestamps, fine print, disclosure microcopy
--text-sm:    0.875rem  (14px)  — secondary UI text, card metadata
--text-base:  1rem      (16px)  — body copy, form inputs
--text-lg:    1.125rem  (18px)  — emphasized body, card titles
--text-xl:    1.5rem    (24px)  — section headers
--text-2xl:   2rem      (32px)  — page titles
--text-3xl:   2.75rem   (44px)  — report headlines (Fraunces)
--text-4xl:   4rem      (64px)  — homepage hero (Fraunces)
```

Sub-12px is reserved for **monospace labels and metadata inside dense data widgets** (score
rings, valuation cards, table eyebrows) — never for prose. Only two micro values are permitted,
`10px` and `11px`; any other arbitrary sub-12px size is drift and should snap to one of these.

**Spacing scale** (4px base unit, used for all padding/margin/gap — no arbitrary values):

```
--space-1: 4px   --space-2: 8px   --space-3: 12px  --space-4: 16px
--space-5: 24px  --space-6: 32px  --space-7: 48px  --space-8: 64px  --space-9: 96px
```

**Radius:** two values only. `--radius-sm: 6px` for inputs, buttons, chips. `--radius-md: 12px`
for cards. The seal graphic itself is the only fully circular element in the interface —
reserving circles for that one motif keeps it special rather than diluted by rounded avatars and
rounded everything-else. (Avatars use `--radius-md`, not full circles — a subtle but deliberate
choice that keeps "circular" meaning something in this product.)

**Shadow:** one elevation value, used sparingly — `--shadow-card: 0 1px 2px rgba(20,23,31,0.06),
0 4px 12px rgba(20,23,31,0.04)`. Trust-critical cards (call block, disclosure block)
additionally get a **double-ruled border** (`border: 1px solid var(--ink); box-shadow: 0 0 0 3px
transparent, inset 0 0 0 1px rgba(20,23,31,0.08)` effectively rendered as two close parallel
rules) — a ledger-entry-box treatment reserved specifically for information that must never be
visually mistaken for ordinary content.

### 1.5 Motion principles

- **The seal animation is the one orchestrated moment in the product.** Press-scale (0.96 → 1.0)
  + 8° rotation settle + a radial ink-bleed opacity fade, ~400ms, ease-out. Everything else in the
  product uses fast, quiet transitions (150–200ms ease) for hover/focus states and simple fades
  for content loading — no triggered scroll reveals, no staggered card entrances, no parallax.
  (The one exception is the scrub-based, reduced-motion-safe landing reveal defined in
  `docs/MOTION.md` law 11.)
  Restraint everywhere else is what makes the seal moment land.
- All motion respects `prefers-reduced-motion: reduce` — the seal becomes an instant state-swap
  (unlocked card → locked card with seal already present) rather than an animated press.

### 1.6 Accessibility floor (non-negotiable, applies to every page in Part 2 without being restated)

- Color is never the only signal — every fact-check verdict, every hit/miss state, every status
  chip pairs its color with a text label or icon.
- Visible keyboard focus ring on every interactive element (`2px solid var(--verdigris)`, offset
  2px).
- Minimum contrast: body text 4.5:1, large text/headlines 3:1, verified against the `--paper`
  background specifically (not assumed from a generic white background).
- All interactive elements reachable and operable via keyboard, including the fact-check claim
  popovers (focusable, `Escape` dismisses) and the debate thread (standard form semantics, not
  custom click-only widgets).
- Every image, icon-only button, and the seal graphic itself carries a real `alt`/`aria-label` —
  e.g., the locked seal reads "Locked May 3, 2026 — price target cannot be edited," not "seal
  icon."

### 1.7 Responsive strategy

Three breakpoints, mobile-first:

```
--bp-sm: 480px    (large phone)
--bp-md: 768px    (tablet / small laptop)
--bp-lg: 1200px   (desktop)
```

General rule used throughout Part 2 instead of repeating it per page: **the ledger-card treatment
(call block, disclosure block, Track Score badge) never gets simplified or truncated on mobile** — it
may stack above the reading column instead of sitting beside it, but every disclosure field,
every score component, is present at every breakpoint. Only the *editorial* column (report body,
marketing copy) reflows for width; the *trust* surface is breakpoint-invariant by design.

---

## PART 2 — SHARED COMPONENTS

### Build these once, in a component library, before touching any page in Part 3. Every page below references these by name.

### 2.1 `<TopNav>` — role-aware global navigation

**Structure (desktop, 64px height, fixed to top):**

- Left zone: Stoa logo (links to Feed if logged-in-investor, Dashboard if logged-in-creator,
  Homepage if logged out) + **Role switcher** immediately to its right: a small pill button
  reading "Viewing as: Investor ▾" (or "Creator ▾"). Clicking opens a 2-item dropdown
  ("Investor," "Creator") — only shows both options if the account has `role_investor` and
  `role_creator` both true; otherwise this pill is absent entirely and just the logo sits there.
- Center zone (investor context only): search bar, 320px wide, placeholder "Search tickers or
  creators," expands to overlay on focus (mobile: icon-only, expands to full-width overlay on
  tap)
- Right zone: Notification bell (badge count if unread > 0) → Account avatar (12px `--radius-md`
  square-ish avatar, not circular per §1.4) → dropdown: Settings, [role-specific dashboard link],
  Log out

**Why the role switcher lives in the nav bar itself, not buried in settings:** this is the single
component that makes the whole two-sided product legible. It needs to be visible on every screen,
not discovered once.

**States:** logged-out shows [Log In] [Sign Up] in the right zone instead of avatar/bell. Loading
state: skeleton pill for avatar only, nav renders instantly (never block the whole nav on auth
resolution).

**Mobile (< 768px):** collapses to logo + hamburger. Hamburger opens a full-height drawer with the
same items stacked, role switcher pinned at the top of the drawer.

### 2.2 `<TrackScoreBadge>` - appears everywhere a creator's name does

Three size variants, same component, same visual language at every size. (`MoatBadge` is a
deprecated alias that re-exports this component; do not use it in new code.)

- **`size="sm"`** - used inline next to a creator's name in feed cards, comments, debate
  threads. Renders as: small ink-ring seal icon + score number in Plex Mono, e.g. `78`.
  Tapping/clicking always opens that creator's Track Score analytics page - never just decorative.
- **`size="md"`** - used on the report detail page's trust rail and on creator cards in
  Discover/leaderboard. Adds hit rate when available.
- **`size="lg"`** - used on the creator's own profile / score page. Full treatment: score, hit
  rate, sample size, and a "View full breakdown" link, laid out as a small ledger-card itself
  (double-ruled border per §1.4).

**Score color mapping** (the number itself, not a background fill - keep it legible, not a
traffic light): Track Score is a trust signal, not market sentiment. Use `--ink` for scored
values and `--brass` when the sample is provisional (under 10 resolved calls). Verdigris/rust
stay reserved for hit/miss and fact-check verdicts. Always pair the numeral with the word
"Track" / "Track Score" at `md`/`lg` so the score is never ambiguous about what it measures.

**Empty state (brand-new creator, zero resolved calls):** renders as `-` in neutral gray with a
small "Not yet scored" tooltip on hover - never shows a fabricated "0," which would read as a
failing score rather than an absence of data.

### 2.3 `<DisclosureBlock>` — identical everywhere, creators cannot restyle this

Fixed layout, always three rows, always visible (never collapsed, never inside an accordion):

```
┌───────────────────────────────────────────────┐
│  Position: [ Holds a position ] or [ No position ]  │
│  Compensation: [ Certified independent ] or          │
│                [ Compensation disclosed — see note ] │
│  Views: [ These are the creator's own views ]        │
└───────────────────────────────────────────────┘
```

Rendered as a ledger-card (double-ruled border, `--paper` background at 100% opacity even when
the rest of the page has a paywall scrim over it — see §2.4). Each row is a fixed-format chip,
not free text, specifically so a creator cannot write persuasive copy into their own disclosure.
If `compensation_tied = true`, the second row expands one line to show `compensation_detail`
verbatim, in `--text-sm`, no styling flourishes.

This is the one component in the entire product explicitly *not* covered by a creator's branding
controls (§ Page Branding, Part 3). State that constraint directly in the component's own code
comments for Claude Code's benefit: **never accept a theme/color prop on this component.**

### 2.4 `<PaywallGate>`

Wraps the report body content only — never the ticker strip, call block, disclosure block, or
Track Score badge, which render above/outside this component entirely.

- Renders the wrapped content up to a configurable line-clamp (default: first 3 paragraphs), then
  applies a soft gradient scrim (`--paper` fading from 0% to 100% opacity over the final 80px of
  visible text) rather than a hard cutoff — this avoids the jarring "content just stops" feeling.
- Below the scrim: two buttons side by side, **not** styled as one primary/one secondary — they're
  genuinely alternative paths, so both render as equal-weight outlined buttons: `Unlock this
  report — $4` and `Subscribe to [Creator] — $12/mo`. A small line beneath: "Already subscribed?
  [Log in]"
- Loading state while checking entitlement server-side: the gate renders in its "locked" visual
  state by default and swaps to full content only once the server confirms access — **never
  flash the full paywalled content before the check resolves,** which is both a security smell
  and a jarring flicker.

### 2.5 `<LockConfirmModal>` — the seal ritual

Triggered from the Report Editor's "Publish & Lock" button (Part 3, §3.10).

- Modal copy: *"Once locked, this price target can't be edited or deleted. It'll count toward
  your Track Score whether it hits or misses."* Below it, a compact read-only summary: ticker,
  target price, horizon date.
- Two buttons: **"Go back and edit"** (text-style, left, gets default focus) and **"Lock it in"**
  (filled, `--ink` background, right — deliberately not the default-focused element, so a stray
  Enter keypress from habit doesn't lock something by accident).
- On confirming: modal content is replaced in-place by the seal animation (§1.3/§1.5) playing over
  the summary card, then the modal auto-dismisses into the now-locked Report Editor state, target
  price field visually replaced by the locked/sealed treatment (read-only, seal icon, no longer
  an editable input).

### 2.6 `<FactCheckLayer>` — inline annotation system

Wraps rendered report body text. Each `claims` row (from the backend schema, using
`char_start`/`char_end`) gets rendered as an inline `<mark>`-equivalent span with:

- A 2px underline in the claim's semantic color (`--verdigris` fact / `--brass` unproven /
  `--plum` opinion / `--rust` contradicted) — underline, not background highlight, so long-form
  reading stays comfortable
- On hover (desktop) or tap (mobile): a popover anchored to the span showing the verdict label,
  one-line reasoning, and a source link if present
- For `opinion`-verdict claims only: a small speech-bubble icon at the end of the span, labeled
  "Debate" — opens the scoped `<DebateThread>` component (§2.7) for that specific claim, never a
  page navigation
- **Above the report body, before the text starts:** a summary strip, e.g. `12 claims checked  ·
  9 fact  ·  2 unproven  ·  1 opinion`, each segment clickable to jump-scroll to the first claim
  of that type. This exists so a skimming reader gets the fact-check signal even if they never
  hover a single claim.

### 2.7 `<DebateThread>` — scoped comment thread on a single opinion claim

Not a general comment section. Opens as a side panel (desktop) or bottom sheet (mobile) anchored
to one claim.

- Header: the claim text itself, quoted, with its "Opinion" tag
- Threaded replies below, standard comment list (author avatar `sm`, `TrackScoreBadge size="sm"` if the
  replier is also a creator, timestamp, body text)
- Input at the bottom: plain textarea + "Reply" button — no rich formatting, this is meant to be
  quick back-and-forth, not another editor
- Empty state copy: *"No replies yet. Be the first to weigh in on this claim."*

### 2.8 `<StatusChip>` — used for report/call status everywhere

Small pill, `--text-xs`, always icon + label (never color-only per §1.6):

- `Open` — neutral gray outline, small clock icon, "Resolves [date]"
- `Resolved · Hit` — verdigris fill, seal-stamp icon, "Hit"
- `Resolved · Miss` — rust fill, seal-stamp icon (rotated, per §1.3), "Miss"
- `Draft` — dashed neutral outline, pencil icon, "Draft" (creator-facing only, never shown to
  investors)

### 2.9 Buttons, inputs, toasts — base component notes

- **Primary button:** `--ink` fill, `--paper` text, `--radius-sm`. Reserved for the single most
  important action per screen (per §0's "one primary CTA per page" rule from the product spec) —
  never two primary buttons visible at once.
- **Secondary button:** `--ink` 1px outline, `--ink` text, transparent fill.
- **Text button:** no border/fill, `--ink` text, underline on hover only.
- **Destructive action** (cancel subscription, delete draft): uses `--rust` text on an otherwise
  secondary-style button — never a filled red button, which would clash with the muted palette
  and overstate the severity of, say, canceling a $5 subscription.
- **Toast notifications:** bottom-center on desktop, bottom-full-width on mobile, `--ink`
  background, auto-dismiss 4s, always paired with an icon (checkmark / info / the seal glyph for
  "Locked" confirmations specifically — reusing the signature motif here reinforces it without
  adding a new visual language).
- **Copy voice for every button, toast, and empty state:** active voice, names the action from
  the user's side of the screen, keeps vocabulary identical across trigger → confirmation (a
  button labeled "Lock it in" produces a toast that says "Locked," never "Submitted
  successfully"). Errors state what happened and how to fix it, without apologizing or hedging.

### 2.10 `<PlaceholderThumb>` — the generated stand-in for a video thumbnail

One picture, drawn twice: once in the browser as a React component
(`src/components/ui/placeholder-thumb.tsx`), once as pixels for the demo video clips
(`scripts/demo-video-frames.ts`). They must stay identical, so the same analyst looks the same
whether a surface is showing their placeholder or playing their clip. **Change one and you have
to change the other**, then regenerate and re-upload the clips.

- **Colour** comes from `analystColor()` in `src/lib/design/analyst-color.ts`, seeded on the
  analyst's **id**, never their handle or name, so a rename does not change their colour. Eight
  muted tones, deliberately excluding `--verdigris` and `--rust`: those two carry verdict meaning
  (Fact/Hit, Contradicted/Miss) and must never be spent on decoration. Sage is greyer and lighter
  than verdigris, clay browner and softer than rust, so a placeholder can never be misread as a
  seal.
- **Wash:** `linear-gradient(158deg, color-mix(in srgb, <colour> 55%, var(--paper)), <colour>)`.
  Mixing toward `--paper` rather than white is what keeps it warm and on-palette.
- **Figure:** a circle (head) and a rounded shoulder shape rising from the bottom edge, filled
  `--paper` at 20% opacity, in a 100x100 viewBox with `preserveAspectRatio="xMidYMax meet"` so the
  shoulders meet the bottom edge at any aspect ratio: 16:9 on Today, 4:5 on an Explore tile,
  near-square on a rail.
- **No text and no initials, ever.** The surrounding UI already names the analyst and the
  headline; repeating either here only adds noise at the size the image has to work at.
- **It is not a video affordance.** It never draws a play glyph, a duration or a VIDEO badge;
  those are earned from a stored clip and belong to the call site.
- Every call site renders it behind a `thumbnailUrl ? real : placeholder` check, so it disappears
  on its own as real thumbnails arrive, with no migration and no cleanup.

---

## PART 3 — PUBLIC PAGES (logged out)

### 3.1 Homepage — `/` (public Stoa Dispatch)

Logged-out visitors land on the **public** daily Dispatch — same editorial design as
[dailydispatch.app](https://www.dailydispatch.app/). Signed-in users are redirected to `/home`.

**Layout, top to bottom** (centered column, max-width ~672px, `--paper` background):

**Masthead**

- Wordmark: spaced serif **S T O A** + uppercase **Dispatch** label
- Hairline rule
- Dateline row (Plex Mono, uppercase): `Issue №{N} · {WEEKDAY, MONTH DAY, YEAR} · {N} min read`

**Lead story** — centered Fraunces headline, optional dek, author row, ticker, target, Read link

**Secondary list** — "Also in this issue" — dense wire (not cards)

**Today's Record** — ledger table; hidden when empty

**How it works** + **For creators** (public only)

**Backend:** `GET /api/dispatch` (no personalization). Homepage server-renders via `buildDispatch(false)`.

---

### 3.1b Home — `/home` (personalized Dispatch)

The signed-in home for **investors and analysts**. Same Dispatch design as `/`, but content is
scoped to follows, subscriptions, saved reports, and recently read analysts.

**Nav:** `Home` appears first in `<TopNav>` when signed in; logo links to `/home`.

**Masthead dateline:** `Your briefing · {DATE} · {N} min read`

**Tagline:** "From the analysts you follow and subscribe to…"

**Lead** — left-aligned for reading (briefing style)

**Secondary** — "Also in your briefing"

**Today's Record** + **Top creators this week** leaderboard

**CTA:** "Browse all research in Discover →"

**Empty state** (no signals / no matching content): prompt to follow analysts → `/discover?tab=researchers`

**Backend:** `GET /api/dispatch?personalized=true` — same ranking as `buildDispatch(true)`.

---

### 3.2 Explore — `/explore` (public, teaser mode)

**Layout:**

- `<TopNav>` (logged-out)
- Page header: "Explore research" + subtext "Browse locked calls from every creator on Stoa."
- **Filter row** (sticky beneath header on scroll): sector chips (multi-select: Tech, Biotech,
  Small-Cap, Macro, Crypto, Dividends, Energy, Consumer — scrollable chip row on mobile), a
  `Track Score ≥` slider (0–100, default 0), a Free/Paid toggle (All / Free only / Paid only)
- **Results grid:** same feed-card component used in the logged-in Feed (§4.1), but every card's
  primary CTA reads **"Read preview"** instead of "Read" — leads to the Report Public Preview
  page (§3.4), never the full report
- Sort control, top-right of the results grid: dropdown "Most recent" / "Highest Track Score" /
  "Highest upside"
- **Empty state (no results match filters):** "No research matches these filters yet." + a
  **"Clear filters"** text button — never a dead end with no recovery action
- Persistent bottom banner, dismissible per session (stored in a cookie, not account state): "Sign
  up free to follow creators and unlock reports" + **"Sign up"** button

---

### 3.3 Public creator profile — `/@handle`

**Layout, top to bottom:**

**Header band** (full-width, ~200px tall):

- Creator's banner image/color (their branding control, per Part 4's Page Branding spec) fills
  the background
- Avatar (`--radius-md`, 96px) overlaps the bottom edge of the banner by half its height (a
  deliberate anchor point — same treatment on every profile so it reads as a system, not a
  per-creator layout choice)
- Beside the avatar: display name (Plex Sans, `--text-2xl`, semibold — **not** Fraunces here,
  since this is UI chrome identifying a person, not editorial content), handle in `--text-sm`
  muted, a small verified-identity check icon with tooltip "Identity verified — not a credential
  claim"

**`<TrackScoreBadge size="lg">`** — full ledger-card treatment, placed directly below the header band,
full width on mobile / left-aligned ~40% width on desktop with the pricing card (below) filling
the remaining space alongside it

**Bio** — one line, Plex Sans `--text-base`, creator-written, max ~140 characters enforced at
input time (Part 4, Page Branding)

**Pricing card** (ledger-card styling, sits beside the Track Score badge on desktop):

- Subscription price if enabled: "$[X]/mo" large, Plex Mono, **"Subscribe"** primary button
- Per-report price if enabled, shown as a secondary line: "or $[X] per report"
- If a viewer is already subscribed: card swaps to "You're subscribed" state with a small
  "Manage" link instead of a Subscribe button

**Report archive** — reverse chronological list, full width:

- Each row: ticker (Plex Mono, bold), headline, `<StatusChip>`, locked target price + horizon
  date, small fact-check summary (`9 fact · 2 unproven`)
- Fixed note directly above the list, `--text-xs`, permanent, not dismissible: **"All calls,
  including missed targets, stay visible permanently."** — this single sentence is doing real
  trust-building work and should never be hidden behind a tooltip or footnote styling
- Pagination: simple "Load more" button at the bottom (not infinite scroll — a creator's track
  record is something a visitor should be able to deliberately page through, not accidentally
  blow past)
- **Empty state (brand-new creator, zero published reports):** replaces the list with: "No
  reports published yet." — and if the viewer is logged in and not this creator, a **"Follow"**
  button so they can come back when there's something to read

---

### 3.4 Report public preview — `/@handle/[report-slug]`

**Layout:** identical page shell to the full Report Detail Page (§4.3) for everything above the
fold — ticker strip, creator strip with `<TrackScoreBadge>`, the call block (fully visible, never
gated), the `<DisclosureBlock>` (fully visible, never gated), and the fact-check summary strip
(fully visible, never gated).

Only the report body itself is wrapped in `<PaywallGate>` (§2.4), previewing the first 2–3
paragraphs before the scrim.

**Bottom bar:** Share button (copies/opens a native share sheet with this exact URL — this page
*is* the shareable object, so there's no separate "public preview link" to generate), and a small
"New here?" prompt with **"Sign up"** for anyone who wants to follow/subscribe before unlocking.

---

### 3.5 How It Works / Pricing — `/how-it-works`

Single long-scroll marketing page, contained width (~760px), `--paper` background:

- Restates the three-step "how it works" from the homepage in more depth, one section each, each
  with a supporting screenshot-style illustration of the actual component in question (the
  fact-check layer, the lock/seal moment, the Track Score badge)
- **For investors** subsection: explains subscription vs. per-report pricing from the reader's
  side, links to §3.2 Explore
- **For creators** subsection: explicit platform fee statement, large and unambiguous: "Stoa
  takes 10% of what you earn. You keep 90%." — followed by a simple worked example table
  (Subscriber pays $12 → Stoa keeps $1.20 → creator receives $10.80), since a worked example does
  more trust-building than a percentage alone
- CTA blocks at the end of each subsection, matching homepage CTAs

---

### 3.6 Trust & Methodology — `/trust`

This is a real page, not a footer afterthought — it's the single most important credibility asset
the platform has, and it needs to be genuinely legible to a skeptical reader, not legal
boilerplate.

- **Track Score section:** plain-language explanation of the three-factor formula (hit rate,
  average return, statistical significance/sample-size weighting), including an honest note that
  scores with small sample sizes are shown with a "provisional" indicator (see Track Score Analytics,
  Part 5) rather than presented with false confidence
- **Fact-check section:** explains the fact/unproven/opinion/contradicted taxonomy in plain
  terms, with one real (or realistic sample) example of each verdict shown inline
- **Lock mechanism section:** explains, in the same tone as the rest of the page (not legalese),
  that locked calls cannot be edited or deleted, and that the audit trail behind the scenes
  exists specifically so this claim is independently checkable, not just asserted
- **Identity verification section:** explains what "verified" does and doesn't mean — a real,
  accountable person, not a credential or license claim
- No CTA buttons on this page at all — its only job is to be trustworthy and readable, not to
  convert

---

### 3.7 Legal / Disclosures — `/legal`

Standard legal page structure (Terms, Privacy, and a dedicated **"Not Investment Advice"**
disclosure section placed first, above the fold, not buried at the bottom of a long ToS document)
— content itself is out of scope for a design spec, but the disclosure section specifically
should use the same page shell and typography as Trust & Methodology, not a dense wall of 8pt
legal type, since this is a page real users will actually be directed to.

---

### 3.8 Sign Up — `/signup`

**The role fork.** Centered card, ~480px wide, `--paper` background:

- Header: "Join Stoa"
- Two large tappable cards side by side (stacked on mobile), each ~200px tall:
  - **"I invest"** — icon (magnifying glass / chart), one line: "Follow verified analysts. Every
    claim fact-checked. Every call tracked."
  - **"I create research"** — icon (pen / seal), one line: "Publish research, lock your price
    targets, get paid — your page, your price."
- Beneath both: text link, `--text-sm`: "Not sure? You can add the other role anytime from
  Settings."
- Below the fork: email input + **"Continue with email"** button, plus **"Continue with Google"**
  / **"Continue with Apple"** OAuth buttons (standard treatment, provider logos, `--radius-sm`
  outlined buttons)
- Footer line: "Already have an account? [Log in]"

Selecting a card doesn't submit anything by itself — it sets the role selection and reveals the
email/OAuth fields beneath it (the two cards collapse to a small "Signing up as: Investor
[change]" chip once a choice is made, so the form doesn't feel like it vanished).

### 3.9 Log In — `/login`

Simple, no role fork (role is already set on the account): email input, "Continue with email"
(magic link — no password field needed if using Supabase magic-link auth; if using password auth
instead, standard email+password with a "Forgot password?" link). OAuth buttons matching signup.
Footer: "New to Stoa? [Sign up]"

---

## PART 4 — ONBOARDING (post-signup, pre-first-use)

### 4.1 Investor onboarding — `/onboarding/investor`

Single screen, deliberately minimal (per the product spec's "under 30 seconds" target — every
extra field here has a real conversion cost):

- Header: "What are you interested in?" + subtext "We'll use this to shape your feed. You can
  change it anytime."
- Grid of sector chips (multi-select, minimum 3 required to enable Continue, but a **"Skip for
  now"** text link is always present and always works — never force the selection)
- Primary button: **"Continue"** (disabled/muted until 3+ selected, unless skipped)
- On continue: redirects straight to `/feed`, pre-populated per the Feed spec's empty state
  (§5.1)

No progress bar, no "step 1 of 1" chrome — a single-screen flow doesn't need wayfinding.

### 4.2 Creator onboarding — `/onboarding/creator/*`

Multi-step wizard, **persistent progress indicator at the top** (5 filled/unfilled dots, not a
percentage bar — dots read faster at a glance for a short sequence): Verify · Brand · Price ·
First Report · Done. Each step is its own route (`/onboarding/creator/verify`, `/brand`,
`/price`, `/first-report`) so a creator can leave and resume without losing progress —
resumption state comes from the backend's `profiles` + `identity_verifications` + report-draft
records, not client-side-only state.

**Step 1 — `/onboarding/creator/verify`:**

- Headline: "Verify your identity"
- Body copy, set apart in a quiet callout box (not alarming, just distinct): "Your Track Score
  only means something if you're a real, accountable person. We verify identity, not
  credentials — anyone can build a track record here."
- Embedded PayPal identity/business-verification flow (their hosted onboarding redirect via the
  Partner Referrals API) — while `status = 'pending'`, this step shows a waiting state:
  "Verifying... this usually takes under a minute" with a subtle indeterminate progress
  indicator, and the wizard **does not** allow proceeding to Step 2 until `status = 'verified'`.
  **Product decision on this build:** the Verify step is dropped entirely (Brand → Price → First
  Report → Done) since PayPal's onboarding doesn't expose a separate identity-verification
  product the way Stripe Identity did — PayPal runs its own KYC during account onboarding, so
  there's nothing distinct to surface here as a wizard step.
- On failure (`status = 'failed'`): clear, non-blaming copy — "We couldn't verify that. [Try
  again]" plus a "Need help? [Contact support]" link

**Step 2 — `/onboarding/creator/brand`:**

- Two-column layout: form on the left, **live preview pane on the right** (a real, small-scale
  render of the actual public profile header, updating on every keystroke/selection — not a
  static mockup image)
- Fields: Handle (text input with inline availability check — green check or red "taken" as the
  person types, debounced), Display name, One-line bio (character counter, 140 max), Avatar
  upload, Banner color/image picker, Color theme selector (a small set of preset accent pairings,
  not a full color picker — full creative freedom here would fight the design system's restraint;
  offer maybe 6 curated theme options that each still respect the base `--ink`/`--paper`
  structure)
- Primary button: **"Continue"**, disabled until handle + display name are valid

**Step 3 — `/onboarding/creator/price`:**

- Toggle group: "Subscription," "Per-report," "Both" (at least one required)
- If Subscription selected: monthly price input, pre-filled with a category-based suggestion
  (editable), Plex Mono numeral field with a `$`/mo suffix
- If Per-report selected: same pattern, per-report price
- **Fixed, unmissable line directly beneath the pricing fields**, same treatment as the disclosure
  block's permanence: "Stoa takes 10% of what you earn. You keep 90%." with a tiny worked-example
  tooltip
- Primary button: **"Continue"**

**Step 4 — `/onboarding/creator/first-report`:**

- Drops the creator directly into the real Report Editor (§6.2) with a sample ticker pre-loaded
  (e.g., a fictional or clearly-marked "SAMPLE" ticker) and inline coach-mark tooltips
  (dismissible individually, "Got it" buttons) pointing at: the price-target lock field ("This
  becomes permanent once you publish"), the AI fact-check panel ("Every claim gets checked before
  you can lock"), the disclosure checklist ("Required before publishing — investors always see
  this")
- A **"Skip tutorial, go to dashboard"** text link is always available in the top-right, for
  anyone who wants to explore on their own rather than follow the guided flow

**Step 5 — implicit "Done":** lands on `/dashboard` with the onboarding checklist widget (§6.1)
showing whatever's actually complete — if they skipped the first-report tutorial, "Publish first
report" remains unchecked and the checklist persists until it's genuinely done.

---

## PART 5 — INVESTOR APP

### 5.1 Home + Discover

**Home (`/home`):** Personalized Stoa Dispatch (§3.1b) — follows, subscriptions, saved + recent
reads. Requires sign-in.

**Discover (`/discover`):** Browse surface — report cards in a responsive **2-column grid**
(trending, recent, following, subscriptions tabs). Researchers tab stays a card grid. Sidebar:
top analysts.

**Feed card component** (reused in Discover tabs):

```
┌──────────────────────────────────────────────┐
│ [avatar] Creator Name  [TrackScoreBadge sm]         │
│ TICKER · Company Name                          │
│ Headline text, one line, truncated              │
│ Target: $XX.XX  ·  by [date]  ·  ↑12% upside   │
│ [fact-check summary chip]                       │
│                                    [Read] [···] │
└──────────────────────────────────────────────┘
```

- The `[···]` overflow menu: "Add to watchlist," "Share," "Not interested" (the last one dismisses
  this specific card from the feed and is a real signal fed back into ranking, not just a visual
  dismiss)
- Card CTA reads "Read" if included in an active subscription, "Unlock — $X" if per-report priced
  and not yet purchased, "Subscribe" if subscription-only and not subscribed

**Empty state (brand-new investor, "Following" tab, nothing followed yet):** replaces the feed
with a "Recommended for you" carousel — same creator-card component as the homepage's featured
carousel, pulled from the investor's onboarding sector picks — never a blank feed with just the
filter row showing.

### 5.2 Search results — `/search?q=...`

- Search input persists at the top (same component as `<TopNav>`'s search, now expanded inline)
- Two tabs: "Creators" and "Tickers" — result type genuinely changes the card layout, so these
  shouldn't be blended into one mixed list
- Creators tab: same creator-card component as homepage/Explore
- Tickers tab: ticker symbol + company name + "X creators have covered this" + a mini list of the
  top 3 most-recent reports on that ticker, each linking straight to the Report Detail Page
- Empty state: "No results for '[query]'" + suggestion to browse Explore instead, with a direct
  link

### 5.3 Report Detail Page ★ — `/@handle/[report-slug]` (subscriber/purchaser view)

This is the highest-scrutiny page in the product — every element here exists to answer "can I
trust this specific claim, right now."

**Full layout, desktop (two-column, ledger sidebar sticky on scroll):**

```
┌─────────────────────────────────────────────────────────────┐
│  <TopNav>                                                     │
├─────────────────────────────────────┬─────────────────────────┤
│  TICKER · Company Name · $XX.XX ↑0.4% │  [avatar] Creator Name  │
│                                        │  [TrackScoreBadge md]         │
│  Report Headline (Fraunces, 3xl)       │  [Subscribe/Following]  │
│                                        │                         │
│  ┌─ CALL BLOCK (ledger-card) ────┐    │  ┌─ DISCLOSURE BLOCK ─┐ │
│  │ Target: $XX.XX  [seal icon]   │    │  │ Position: ...      │ │
│  │ Horizon: [date]                │    │  │ Compensation: ...   │ │
│  │ Upside: +XX%  [StatusChip]     │    │  │ Views: certified    │ │
│  │ Locked [date]                  │    │  └─────────────────────┘ │
│  └────────────────────────────────┘    │                         │
│                                        │  [fact-check summary]   │
│  ── report body, Fraunces body-serif   │  9 fact · 2 unproven ·  │
│     with <FactCheckLayer> annotations  │  1 opinion               │
│     inline throughout ──               │                         │
│                                        │                         │
│  [PaywallGate scrim if not entitled]  │                         │
│                                        │                         │
│  Share · Report an issue               │                         │
└─────────────────────────────────────┴─────────────────────────┘
```

- The right column (creator strip + call block... wait, call block is left/main — correction:
  call block sits directly under the headline in the main reading column since it's the anchor of
  the report itself; the right rail holds creator identity + disclosure + fact-check summary) is
  `position: sticky` on desktop so it stays visible as the reader scrolls through a long report —
  the trust surface should never scroll out of view while someone's reading the claims it's
  vouching for.
- **Mobile:** right-rail content moves to a single stacked block directly beneath the headline,
  above the report body — same content, same order, no sticky behavior (not reliable on mobile
  viewports), but still positioned *before* the body text starts, never after.
- Report body typography: Fraunces at a body-friendly weight/size (not the display cut used for
  the headline) — this is the one place in the product where long-form serif reading is the
  actual point, distinct from Plex Sans everywhere else.
- **`<FactCheckLayer>`** wraps the entire body as described in §2.6 — underlined claims, hover/tap
  popovers, debate icons on opinion claims.
- **Bottom bar:** Share button (native share sheet / copy-link), "Report an issue" (opens a
  lightweight form — flags to moderation, not a public comment)

**States:**

- Not yet entitled: `<PaywallGate>` active on the body only, everything else full-strength per
  §2.4
- Loading: skeleton for the report body only; ticker strip, call block, and disclosure block
  render from cached/fast metadata queries and should appear near-instantly even if the body is
  still loading
- Open (unresolved) call: `<StatusChip>` reads "Open · Resolves [date]"
- Resolved: `<StatusChip>` reads Hit/Miss with the second stamp overlay per §1.3

### 5.4 Creator profile (logged-in investor view) — `/@handle`

Identical to the public version (§3.3) with two additions:

- Subscribe button reflects real state (Subscribed / Follow toggle both present and
  independent — following is free and just affects feed ranking + notifications; subscribing is
  the paid relationship. These are two different actions and should never be merged into one
  button.)
- **No message/DM entry point anywhere on this page** — deliberate omission per the backend
  spec's guardrail against 1:1 personalized-advice channels. If Claude Code's component library
  includes a generic "Message" button pattern from elsewhere in the app, it must not be reused
  here.

### 5.5 Following — `/following`

Grid of creator cards (same component as Explore/homepage), each with an inline Unfollow (hover
reveals it as a small "×" on the card, avoiding a whole extra confirmation modal for something
this low-stakes). Empty state: "You're not following anyone yet." + **"Explore creators"**
button.

### 5.6 Watchlist — `/watchlist`

List of tracked tickers, each row: symbol, company name, current price, small sparkline (optional,
defer if the market-data provider doesn't cheaply support historical series — flag this
explicitly to Claude Code as a "build if the data's easy, skip without blocking launch if not,"
since it's a nice-to-have visualization, not a trust-critical element), and "X creators have
covered this" linking into a filtered ticker view (reuses the Search results' Tickers-tab layout,
§5.2). Empty state: "Nothing on your watchlist yet." + a search input right there in the empty
state, not just a link elsewhere.

### 5.7 Notifications — `/notifications`

Simple reverse-chronological list, grouped by day ("Today," "Yesterday," "This week," "Earlier").
Each notification: icon by type (new report = pen, target resolved = seal-stamp icon matching
§1.3's hit/miss treatment, debate reply = speech bubble), one-line description, timestamp, unread
items get a subtle `--verdigris` left-border accent (never a full-row color fill, which gets
visually loud in a long list). Mark-all-read as a small text link top-right. Clicking any
notification navigates to its source (the report, the profile, the thread) and marks it read.

### 5.8 Subscriptions & Billing — `/settings/billing`

List of active subscriptions: creator avatar/name, price, "Renews [date]," and a **"Cancel"**
text-style destructive button (`--rust` text) per subscription — canceling one never touches
another, so there's no bundled "cancel all" action anywhere on this page. Cancel opens a
lightweight confirm ("Cancel your subscription to [Creator]? You'll keep access until [period end
date]." / "Keep subscription" / "Cancel subscription") rather than an immediate destructive
action.

Below subscriptions: Payment method section (card on file, "Update payment method" via PayPal's
hosted flow), and a Purchase history table (report unlocks, one-time purchases, each row linking
back to the report).

### 5.9 Account Settings — `/settings/account`

Standard settings page: email/password (or magic-link management), notification preferences
(toggles per notification type from §5.7's categories — new reports from followed creators,
target resolutions on watchlist tickers, debate replies — each independently toggleable, plus a
global email-digest-frequency setting: Instant / Daily digest / Off).

---

## PART 6 — CREATOR APP

### 6.1 Dashboard — `/dashboard` (home for logged-in creators)

**Layout:**

- `<TopNav>` (logged-in, role = Creator)
- **Top-right, always visible, never scrolled out of reach:** primary button **"+ New Report"** —
  this is the single most important action on the page, filled `--ink` style, and nothing else
  on the dashboard competes with it visually
- **Onboarding checklist widget** (only rendered until every item is complete, then removed
  permanently — not just collapsed): four rows, each a checkbox-style item — Verify identity,
  Customize page, Set pricing, Publish first report — each links directly back into the relevant
  onboarding step or settings page if incomplete. **On this build, "Verify identity" is dropped**
  along with the onboarding Verify step (see §4.2) — the checklist is Customize page, Set
  pricing, Publish first report.
- **Quick stats row**, four cards: Subscribers (count, + or − this week in small text beneath),
  Earnings this month (Plex Mono, `$X,XXX`), Current Track Score (`<TrackScoreBadge size="lg">` reused
  here), Reports awaiting resolution (count, links to the "Open calls" widget below)
- **Open calls widget:** compact table — ticker, target, days remaining until horizon date (Plex
  Mono countdown), each row linking to that report. This exists so the creator feels the same
  accountability pressure their audience sees on the profile archive — it should not read as a
  scary countdown, just a plain, calm table.
- **Recent activity feed:** new subscriber, new debate reply, target resolved, fact-check flagged
  an unproven claim on a draft — same visual list-item pattern as the investor Notifications page
  (§5.7) for consistency across the whole product.

### 6.2 Report Editor ★ — `/dashboard/reports/new` and `/dashboard/reports/[id]/edit`

The other highest-scrutiny screen in the product — this is where the seal ritual (§1.3, §2.5)
actually gets triggered.

**Layout:**

- **Top bar:** draft title (inline-editable text, becomes the report headline), autosave
  indicator (small `--text-xs`, "Saved" / "Saving..." — never a manual save button as the primary
  save mechanism, autosave should be the default with a manual **"Save draft"** button available
  as a secondary, explicit action for creators who want the reassurance), ticker tag selector
  (typeahead against the `tickers` table, shows company name + current price once selected)
- **Two-panel body:** main editor column (left, ~65%) + a **right-side "Lock & Publish" panel**
  (~35%, persistent, not a modal you have to open) containing everything needed to actually
  publish — this keeps the irreversible action's requirements visible the whole time someone is
  writing, rather than surprising them with a checklist only at the very end.

**Main editor column:**

- Rich text editor (headings, bold/italic, lists, embedded images/charts, blockquote) — standard
  editor chrome, Plex Sans throughout (this is drafting UI, not the reading experience, so it
  doesn't use Fraunces here)
- **AI assist side-panel**, collapsible, docked to the editor: "Ask AI to expand this section,"
  "Suggest supporting data for this claim," "Tighten this paragraph" — these insert suggested
  text as a diff the creator explicitly accepts/rejects (never silently auto-writes into the
  document), preserving the certification promise that the published words are genuinely the
  creator's own

**Right-side "Lock & Publish" panel, top to bottom:**

1. **Price target module:** ticker (mirrors the one selected above), target price input (Plex
   Mono), horizon date picker, current price shown for live reference with the calculated
   upside/downside percentage updating as the target changes
2. **Pre-publish fact-check panel:** a **"Run fact-check"** button (also auto-triggers once when a
   creator first attempts to publish, if not already run manually) — while running, a calm
   inline loading state ("Checking claims..."); once complete, shows the claim-by-claim
   breakdown: count by verdict, and a scrollable mini-list of `unproven`-verdict claims
   specifically (the ones needing action), each with an inline **"Add source"** input right there
   so a creator can resolve it without leaving the editor, or a **"Mark as opinion"** button if
   it's genuinely a judgment call rather than a factual claim
3. **Disclosure checklist**, required, each a real toggle/select (not a single "I agree" checkbox
   that hides real information): "Do you hold a position in [ticker]?" Yes/No, "Is any part of
   your compensation tied to this call?" Yes/No (Yes reveals a detail text field), "I certify
   these are my own views" checkbox
4. **Publish button:** **"Publish & Lock"** — disabled until fact-check has run at least once and
   the disclosure checklist is fully answered (not necessarily all "No"/clean — just *answered*,
   since a Yes answer with disclosure is completely valid, an unanswered field is not)
5. Clicking it opens `<LockConfirmModal>` (§2.5) → seal animation → the panel's price-target
   module becomes permanently read-only with the seal icon in place of the input fields, and the
   whole right panel visually shifts from "editing" chrome (dashed borders, muted) to "locked"
   chrome (solid ledger-card border, matching the reading-view call block's styling) — the editor
   should visibly change character the instant something becomes permanent.

### 6.3 My Reports — `/dashboard/reports`

Three tabs: **Drafts** / **Locked (open)** / **Resolved**.

- Drafts: title, last-edited timestamp, `<StatusChip>` "Draft," row actions: Edit, Delete (confirm
  modal, since drafts genuinely can be deleted — only locked reports can't)
- Locked (open): title, ticker, target, countdown to horizon date, click-through to the read-only
  report view
- Resolved: title, ticker, `<StatusChip>` Hit/Miss, actual return %, with a small "Why this
  scored the way it did" link into that specific entry of Track Score Analytics (§6.4)
- Each tab has its own empty state copy specific to that tab ("No drafts yet." / "No open calls
  right now." / "Nothing resolved yet — your first locked call will show up here once its
  horizon date passes.") rather than one generic empty state reused across all three.

### 6.4 Track Score Analytics — `/dashboard/analytics`

- **Score header:** large `<TrackScoreBadge size="lg">` plus the raw components broken out explicitly:
  hit rate, average return, sample size — never just the final number. If `sample_size` is below
  the platform's shrinkage constant `k` (per the backend spec's formula), show a **"Provisional —
  based on a small number of resolved calls"** note directly beneath the score, in the same
  honest register as the Trust & Methodology page.
- **Score history chart:** simple line chart, Plex Mono axis labels, plotting
  `moat_score_snapshots` over time
- **Per-report performance table:** ticker, call date, target, resolution, actual return —
  sortable columns
- **Percentile rank:** shown two ways — "Top X% of all creators" and "Top X% of [creator's
  primary sector] creators" (never just the platform-wide number alone, since a small-cap
  specialist shouldn't read as underperforming a mega-cap dividend writer on a metric that isn't
  apples-to-apples)
- Permanent link: **"How your score is calculated"** → `/trust#moat-score` (same content as the
  public Trust & Methodology page — literally the same page, anchored, not a duplicated
  explanation that could drift out of sync)

### 6.5 Audience — `/dashboard/audience`

- Subscriber count + growth chart (simple line chart, same visual language as the Track Score
  history chart for consistency)
- Churn rate, shown plainly as a percentage with a short explanatory tooltip, not dressed up
- Subscriber list (paginated table: name/handle, subscribed-since date, tier if multiple exist)
- **Top referral sources** — where subscribers are coming from (a simple bar list: Direct,
  Explore/Discover, Shared report links, Search)
- **Referral program section** (full vision, not deferred): a creator-specific referral link they
  can share, with a small dashboard of signups attributed to it — kept genuinely simple, one
  link, one stat block, no complex multi-tier referral mechanics

### 6.6 Earnings & Payouts — `/dashboard/earnings`

- **This month's earnings**, large Plex Mono number, with the **platform fee always shown as its
  own explicit line** directly beneath it every single time this number appears anywhere in the
  product: "Gross: $X,XXX · Platform fee (10%): −$XXX · Net: $X,XXX" — repeating this breakdown
  on every earnings view (not just once at signup) is a deliberate trust-building habit, not
  redundancy.
- Revenue breakdown by source: Subscriptions vs. Report purchases (simple stacked bar or two-line
  comparison)
- Payout method (links out to the PayPal-hosted account dashboard via the backend's
  dashboard-link endpoint — this page doesn't rebuild PayPal's own payout UI, it hands off to it)
- Payout history table: date, amount, status

### 6.7 Page Branding — `/dashboard/branding`

Same two-column form-plus-live-preview pattern as onboarding Step 2 (§4.2), now as a persistent
settings page: handle, display name, bio, avatar, banner, color theme (from the curated set
defined in §1.4/§4.2 — not an open color picker). **Custom domain field** (full vision item): a
text input for a creator's own domain with a "Connect domain" flow, positioned as an
advanced/optional section beneath the core branding fields, clearly marked "Optional — most
creators don't need this."

### 6.8 Pricing Settings — `/dashboard/pricing`

- Subscription price, Per-report price — same fields as onboarding Step 3 (§4.2/Step 3), now
  editable anytime (price changes apply to new subscribers/purchases only — existing subscribers
  keep their locked-in price until they themselves change tiers, standard SaaS practice, and this
  should be stated plainly on the page: "Existing subscribers keep their current price.")
- **Founding-member tier** (full vision item): a toggle to enable a limited-quantity, discounted
  early-access tier — quantity cap input, discounted price input, and a live counter ("14 of 50
  claimed") once enabled
- Platform fee restated here too, same explicit line treatment as Earnings & Payouts

### 6.9 Account & Identity — `/dashboard/settings/account`

Identity verification status (Verified / re-verification needed if a document expired — PayPal
handles the actual re-verification during their own onboarding flow, this page just surfaces
status and a "Re-verify" button when needed), security settings (password/2FA if applicable), and
the same notification-preference pattern as the investor Account Settings (§5.9), with
creator-specific notification types added: new subscriber, new debate reply, report resolved.

---

## PART 7 — IMPLEMENTATION HANDOFF NOTES

### 7.1 Suggested frontend structure

```
/app
  /(marketing)         -- homepage, explore, how-it-works, trust, legal (public shell)
  /(auth)               -- signup, login, onboarding/*
  /(investor)            -- feed, search, following, watchlist, notifications, settings/billing
  /(creator)              -- dashboard, reports/*, analytics, audience, earnings, branding, pricing
  /@[handle]              -- public + logged-in creator profile (shared route, auth-aware rendering)
  /@[handle]/[slug]       -- report detail / public preview (shared route, entitlement-aware rendering)
/components
  /ui                    -- Button, Input, Chip, Toast, Modal base primitives
  /shared                -- TopNav, TrackScoreBadge, DisclosureBlock, PaywallGate, LockConfirmModal,
                             FactCheckLayer, DebateThread, StatusChip  (Part 2, one file each)
  /feed                  -- FeedCard, CreatorCard, Leaderboard
/lib
  /design-tokens.css     -- every value from §1.4, as CSS custom properties
  /tailwind.config.ts    -- maps the token file into Tailwind's theme, don't hardcode hex in components
```

**On this build:** routes are NOT renamed to the `/@[handle]` pattern above — see the adaptation
note at the top of this document. Read the structure above as "what the ideal IA looks like,"
and map it onto the existing `/analyst/[handle]`, `/discover`, `/studio` routes in practice.

### 7.2 Token file, concretely

Everything in §1.4 should exist as real CSS variables from the start, not scattered literal
values:

```css
:root {
  --ink: #14171F;
  --paper: #FAF8F4;
  --verdigris: #2F6E5D;
  --brass: #855F22;
  --plum: #5B4B6B;
  --rust: #A6483C;
  --font-display: 'Fraunces', serif;
  --font-ui: 'IBM Plex Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px; --space-9: 96px;
  --radius-sm: 6px;
  --radius-md: 12px;
  --shadow-card: 0 1px 2px rgba(20,23,31,0.06), 0 4px 12px rgba(20,23,31,0.04);
}
```

### 7.3 Icon set

Use **Lucide** icons for new components going forward (see `AGENTS.md`'s tech stack note) — the
line-icon style matches the restrained, non-illustrative direction this spec calls for. Existing
Phosphor usage across the current codebase is not an urgent rip-out, but don't add more of it;
the goal is Lucide in steady-state, not both libraries indefinitely. Do not add custom SVG
illustrations anywhere except the seal graphic itself, which is the one genuinely custom asset in
the product and should be built once as a proper component (`<SealStamp status="locked" | "hit" |
"miss" date={...} />`) rather than redrawn per usage.

### 7.4 Accessible primitives

For the modal (`<LockConfirmModal>`), popovers (`<FactCheckLayer>` claim popovers), and dropdown
menus (role switcher, notification bell, account menu, overflow `[···]` menus), build on top of
**Radix UI primitives** rather than hand-rolling focus-trap and ARIA behavior from scratch — this
is the fastest path to genuinely meeting the §1.6 accessibility floor rather than approximating
it.

### 7.5 What's deliberately NOT specified here

Two things are real product surfaces but out of scope for this design pass, flagged so nothing
falls through a gap silently:

- **Email templates** (welcome email, digest emails, resolution notifications) — these need their
  own pass, likely simpler/more constrained than the in-app design system, since they render in
  email clients rather than a browser
- **The exact fact-check claim-extraction prompt output schema's rendering edge cases**
  (overlapping claim spans, claims that cross paragraph breaks) — the backend deep dive defines
  the data shape; how `<FactCheckLayer>` handles a pathological edge case in that data is an
  implementation detail worth resolving in code review, not pre-specifying here

### 7.6 One last thing worth saying plainly

Every page in Parts 3–6 above is specified at full scope — nothing here was cut for MVP
sequencing, unlike the earlier product spec's §6. If build sequencing matters once this is in
Claude Code's hands, that's a build-order conversation, not a design one — the design system and
every screen it produces should already be internally consistent whether you build it in this
order or start somewhere else entirely.
