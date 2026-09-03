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
  the Feed is `/feed` (Discover is retired; `/discover` redirects), `/studio` stays `/studio`
  (not `/dashboard`), etc.
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

**Mobile (< 768px):** wordmark on the left, then search, Compose (pencil), Inbox (unread dot)
and the avatar on the right. **There is no overflow menu.** Feed, Today, Explore and Markets
live in the bottom tab bar (`AppTabs`), and Settings and Sign out live in the Account group of
the profile area, which the avatar leads to, so a drawer had nothing of its own left to hold.
Signed out, Sign in and Join sit in the bar directly. Desktop is unchanged: the four surfaces
stay in the top row and the right zone keeps its full-width Compose button and bell.

**`AppTabs` — the bottom tab bar.** A rounded pill, inset from the bottom and sides, floating
over the page rather than welded to the edge, capped at `26rem` and centred. Four destinations,
always labelled.

- **Shrink on scroll.** Scrolling down scales the pill to `0.8` about its bottom edge; scrolling
  up restores it, over `--dur-2` on `--ease-out`. Under `prefers-reduced-motion` it stays at full
  size. This is a deliberate exception to the "do not animate nav" rule in `docs/MOTION.md` §A.4,
  asked for by name; nothing else in the nav animates.
- **Never flickers.** The direction decision is `src/lib/nav/scroll-shrink.ts`, a pure function
  with tests. Movement accumulates in one direction and only flips the bar past an 18px
  threshold, so a resting thumb cannot flutter it; a reversal restarts the count rather than
  netting off, and the top 24px always restores full size.
- **Never covers content.** Because the pill overlays the page, the scroller reserves the
  clearance: `.has-app-tabs main` carries `--main-pad-y + --tab-h` as bottom padding on phones.
  A page that cancels main's padding to break out must cancel the **top** only; cancelling the
  bottom eats this clearance and puts the last row under the bar.
- The pill's own rules live inside the `max-width: 767px` block. They are unlayered, so at
  desktop widths they would otherwise beat the element's `md:hidden` utility.

### 2.2 `<TrackScoreBadge>` - appears everywhere a creator's name does

Three size variants, same component, same visual language at every size. (`MoatBadge` is a
deprecated alias that re-exports this component; do not use it in new code.)

- **`size="sm"`** - used inline next to a creator's name in feed cards, comments, debate
  threads. Renders as: small ink-ring seal icon + score number in Plex Mono, e.g. `78`.
  Tapping/clicking always opens that creator's Track Score analytics page - never just decorative.
- **`size="md"`** - used on the report detail page's trust rail and on creator cards in
  Explore/leaderboard. Adds hit rate when available.
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

### 2.11 `<FeedSurface>` — the Feed

The only video discovery surface. Full-screen: one publication per viewport, native vertical
scroll-snap, nothing below the fold.

- **Stage:** On a phone the clip fills the space between the top nav and the tab bar (object-cover,
  chrome overlaid on the picture). On desktop it stays a 9:16 height-bound card centred on `--paper`.
  The clip is panel 0 of a horizontal track and the publication's evidence cards are the panels
  behind it, so sideways movement is movement through the publication.
- **Two axes, one gesture at a time.** Both axes are native scroll-snap, and each container
  scrolls on exactly one axis: the reader is `overflow-y` only, the evidence track is
  `overflow-x` only. That single fact is what makes the gestures behave. The browser locks a
  touch to its dominant axis by itself, so a dominant-x swipe reaches the track, a dominant-y
  swipe reaches the reader, and a diagonal resolves to whichever won rather than doing both or
  neither. Leave `touch-action` alone: pinning the track to `pan-x` would stop a vertical swipe
  that starts on the video, which is most of them. `overscroll-behavior: contain` on both keeps
  either from chaining into the page.
- **Set `overflow-y` on the track explicitly.** With only `overflow-x` set, CSS promotes the
  other axis to `auto` and the stage silently becomes a vertical scroller nested inside the
  vertical reader, ready to swallow an up-swipe as soon as a card grows taller than the frame.
- **Snap-stop is vertical only.** Each publication is a hard stop, so a fling moves one
  publication and not five. The evidence track has none, so momentum carries across cards
  instead of halting at every one.
- **The track writes back.** The pager, the chevrons and the unlock tracking all read the panel
  index, so a track the reader panned by hand updates it, read on `scrollend` rather than on
  every scroll event. The programmatic scroll stands down when the track is already where the
  state says it is, so a swipe and a chevron press never fight.
- **No scrollbars.** Both use `.scroll-bare`; Tailwind's `[scrollbar-width:none]` ties with
  `.scroll-area` on specificity and loses, which paints a bar across the analyst's face.
- **On a phone:** dateline, headline, and actions sit on the picture (lower third), so the face
  is not squeezed by a second column of chrome. Desktop still uses the paper strip beneath the frame.
- **Above the frame (desktop):** the mono dateline, `CALL · NVDA · AUG 22, 2026 · 0:58`, with the position
  in the feed at the right end. A callless publication has no ticker, so its theme tag takes that
  slot.
- **On the picture:** ticker and direction chips top-left, the resolution seal top-right when the
  call is resolved, the mute control beside it, a progress bar along the top edge, and the
  analyst's lower-third identity band across the bottom (avatar, name, handle, Follow).
- **Beneath the frame (desktop):** the headline, then the editorial action bar (LIKE · DISCUSS · SAVE ·
  SHARE as small outlined icons with mono uppercase letterspaced labels), then the pager (`1 / 7`)
  at the right end. The pager is a button: it jumps to the unlock card.
- **Callless publications show no ticker, no direction chip and no seal.** They anchor on a theme
  or sector tag instead. This is the rule, not a fallback.
- **Keyboard:** up/down between publications, left/right through cards, a double right to the
  unlock card, M to mute, Space to pause.
- **Autoplay:** only the publication in view mounts a player, which is both the autoplay rule and
  the performance rule. A poster covers the frame until playback is under way, because the embed
  is opaque black while an HLS stream starts.
- Bunny's own player chrome is switched off. It draws a control bar exactly where the identity
  band goes, and the surface supplies its own progress, mute and pause.

### 2.12 `<ReportClip>` — the analyst's video on a report

The clip at the top of a report, and deliberately not the Feed's stage.

- **It waits.** The poster shows with a play control and nothing happens until
  the reader presses it. The Feed autoplays because its clips arrive unasked; a
  report is a page someone chose to open, so the choice stays theirs.
- **It plays in place.** Pressing play mounts the player in the same frame
  rather than routing to the Feed. The reader asked to watch this argument, on
  the page where the argument is made.
- **The player only mounts on that press**, which is why it may carry
  `autoplay`: by then there has been a gesture, so no browser blocks it, and
  nothing is downloaded for a reader who only wanted to read.
- **Bunny's own chrome stays on**, unlike the Feed. Someone who pressed play on
  a report wants a scrubber, a volume control and fullscreen. The Feed hides
  them because it supplies its own.
- **Portrait, capped in height on desktop, full-width on a phone.** Analyst
  clips are phone-shaped; a 16:9 frame pillarboxes the player and crops the
  poster to a different shape than the video, so the frame jumps on play. In the
  column the frame hugs the player rather than filling the width, so a portrait
  clip does not sit in a band of its own letterboxing.
- **It is the second column, and it sticks.** The writing is on one side and the
  player on the other, so a reader can watch while reading rather than scrolling
  past the video to reach the words. Sticky needs somewhere to travel, so the
  column is a grid item that stretches to the row height rather than shrinking
  to its contents.
- **On a phone it leads the page and then docks.** Once playing and scrolled out
  of sight it shrinks to a corner and keeps going, with a way back to its place
  and a way to stop it. The player is never re-parented: moving an iframe in the
  DOM reloads it, so the same element changes position and the slot holds its
  measured height.
- **Above the paywall.** The clip is the teaser and is public by design.
- **With no clip the page is a single column of writing** with the trust panels
  beside it, unchanged.

**Two rules across every surface.**

1. **No clip, no slot.** A publication with no video gets no image area: not a
   placeholder, not an empty frame, not a coloured block. It renders as a
   headline, a dek and its metadata, the way a written report does everywhere
   else. Reserving the frame regardless asserts that every publication is a
   video. The components own this themselves (`Poster` and the Today row
   thumbnail return `null`, and carry their own link so a call site cannot leave
   an empty anchor behind).

   This holds on every surface: Today's lead and bands, the profile's lead tier
   and grid, Markets publication rows (which render through Today's row), the
   landing lead, Explore and the Feed. Explore and the Feed only ever query
   publications that have a clip, so the question does not arise there.

   **Every Today band that can carry a frame does.** The lead and Your Desk use
   `Poster`; the three stories beside the lead, Trending Now and the tail of a
   theme cluster use `ClipSlot` (`src/components/today/clip-slot.tsx`), which is
   the same frame at reading-column sizes and is also the Today row's rail
   thumbnail. In the narrow columns the frame sits **above** the headline rather
   than beside it: at 84px beside, Trending Now's headlines came down to two
   words a line.

   Two bands deliberately carry no frame. **Verdicts** is a graded call and the
   seal is its image; a poster beside it would compete with the stamp for the
   same edge. **Market news** is wire copy, not Stoa video.

2. **`ClipThumb` draws every clip poster**, falling back to `PlaceholderThumb`
   only for a clip whose poster frame has not been produced yet. That is a video
   with no still, which is not the same thing as a publication with no video.
   `ClipThumb` exists because Bunny's pull zone refuses requests with no
   `Referer` and Next's image optimiser fetches server-side, so clip posters
   never go through `next/image`.

**Selection is a separate question from rendering.** Where a Today band ranks
candidates, a ready clip multiplies the score the band already computed
(`src/lib/today/video-preference.ts`). Stoa's output is the creator's face and
voice, so the surface should lean towards what a reader can watch.

- **A lean, not an override.** The weight rides on top of the band's own score,
  so a written report that is genuinely the strongest still leads. It settles
  near-ties towards video and leaves a clear winner alone. This replaces an
  earlier rule that kept the lead blind to video, which was a reaction to
  preferring video *hard* and promoting the second-best story whenever the best
  one happened to be written.
- **Never the gate.** Trending Now means "gaining fastest today". The velocity
  threshold that decides whether a publication belongs in the band at all is
  unweighted; the lean only orders what already qualified.
- **No band goes video-only.** The share is capped and checked at every depth
  rather than once at the bottom, because bands get truncated: Trending Now
  shows five of its sixteen on a phone, and a cap checked against the full
  sixteen handed the phone five videos and called it mixed. Where only clips are
  available the band still fills, since a short band is worse than a
  video-heavy one.
- **Applies to** the lead, the three stories beside it, Trending Now and the
  theme cluster. **Your Desk** stays newest-first, because it is the reader's
  own memberships and follows and chronology is the promise there. **Verdicts**
  is untouched: a clip has no bearing on whether a call was right.

A profile's lead still prefers the analyst's video, because a profile is a
storefront. Every band obeys rule 1 when a chosen publication turns out to have
no clip.

### 2.13 `<FilterPicker>` — a filter you type into

Explore's ticker and sector filters. One control for both, so they behave alike.

- **Type to narrow.** Clicking opens a field; typing filters the list; the
  reader picks from what is left. Prefix matches rank above substring matches,
  so "SN" reaches SNOW before anything merely containing "sn".
- **Useful before anything is typed.** The full list shows, ordered
  most-covered first, so the options worth having are the ones in view.
- **No counts.** A number on every row is noise on a page this quiet, and the
  reader is picking a ticker rather than auditing coverage. Ordering carries
  that information instead, and `filterOptions` returns names only so the counts
  cannot creep back into a call site.
- **Quiet and typographic**, matching the page: mono, uppercase, letterspaced,
  hairline border, no heavy chrome. The trigger is unchanged from the menu it
  replaced.
- **Popover on a wide screen, sheet on a phone.** The sheet is the case that
  breaks: a list anchored under the trigger sits behind the on-screen keyboard,
  so the reader types and cannot see the options. It is sized from
  `visualViewport`, the only thing that reports the space the keyboard has left,
  with the field pinned at the top and the results scrolling in what remains.
- **Subscribe, do not measure.** Both the breakpoint and the viewport come
  through `useSyncExternalStore`. An effect that measures and then sets state
  has to defer its first read to avoid a render loop, and anything deferred to
  an animation frame never happens where frames are not being produced, which
  left the sheet rendering as a desktop popover.
- **Keyboard:** arrows move, Enter selects, Escape closes.

### 2.14 `<EditedMarker>` / `<EditedFlag>` — a publication that was revised

A published report can be edited (headline, dek, thesis, cards, tags) and every edit is disclosed
wherever the publication appears. The marker is **brass, never rust**: an analyst correcting
themselves in the open is doing the right thing, and the interface reads that way rather than
implying something was covered up. A pencil, not an alert.

- `<EditedMarker edits={...}>` on the publication itself: a small `EDITED` chip beside the byline
  that opens a popover of what changed and when. `w-[min(92vw,22rem)]` with collision padding, so
  it fits a 390px screen.
- `<EditedFlag editedAt={...}>` in a list: the same chip without the popover, carrying the
  timestamp in its `title`. A row in a feed has neither the room for the panel nor a reader who
  asked for it.

**What it can honestly show differs by section, and the panel says so** rather than pretending to
a uniform diff:

| Section | Shown publicly |
|---|---|
| Headline, standfirst | Full before and after. Both are already public everywhere the publication appears. |
| Thesis | That it changed, and when. Not the wording: the body sits behind the paywall, so quoting it publicly would leak paid content. The previous text is kept in `report_versions`, author-only. |
| Cards, tags | That they changed, and when. Compared before writing, so a no-op save is never disclosed as a change. |

The call, its entry price and its resolution can never be edited, and the panel opens by saying
so. That sentence is the reason the rest of the marker is trustworthy.

### 2.15 `<ArchiveDialog>` and `<DeleteDialog>` — one is reversible, one is not

These sit one row apart in the Publications list and **must never read alike**.

- **Archive** is offered on every publication. Recoverable, and its copy says so.
- **Delete** is offered only on a publication carrying **no call**, and is absent (not present and
  refused) otherwise. The permanence guarantee exists to stop an analyst burying a bad call; a
  publication with no call is content, and a creator may remove their own content.

The delete dialog does not reuse the archive copy with a harder verb. It names what is destroyed
inside a **rust-bordered** block, states that archive is the reversible option, and requires the
creator to type `DELETE` before the confirm button turns on. Rust is doing sentiment work here,
which is exactly what rust is for.

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

**CTA:** "Browse every analyst on Explore →"

**Empty state** (no signals / no matching content): prompt to follow analysts → `/explore`

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

### 5.1 Home + Feed

**Home (`/home`):** Personalized Stoa Dispatch (§3.1b) — follows, subscriptions, saved + recent
reads. Requires sign-in.

**Feed (`/feed`):** The full-screen vertical video reader, and the only video discovery surface.
One publication fills the viewport and scrolling snaps to the next; the clip autoplays muted on
arrival and stops on leaving. The clip and the publication's evidence cards share one 9:16 stage,
so moving sideways moves through the evidence. Above the frame, the mono dateline; on the picture,
ticker and direction chips, the seal when resolved, and the analyst's lower-third identity band;
beneath it, the editorial action bar and the pager. See §2.11.

There is no browse-as-text surface. The tabs, the layout toggle and the report-card grid that
used to live here went with Discover; scanning the catalogue is Explore's job.

**Feed card component**:

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

**Evidence cards (`<ReportCards>`).** The publication's card stack renders here as a horizontal
strip above the thesis, reusing the Feed's `FeedCardView` so a card looks identical in both
places. Per-card locks still apply, so the strip sits either side of the report paywall and
sealed cards blur themselves. Profile and Today deliberately show only the `CARDS` content
badge, not the deck. A `figure` card's image must be a stored `http(s)` URL: the schema rejects
anything else, and a stored value that is not fetchable falls back to the card's own
"Figure not available" placeholder rather than being handed to the image loader.

**Archived publications (`<ArchivedBanner>`).** An archived publication opens with a solid-ink
ARCHIVED chip above the headline, saying it is hidden from the public, with Restore inline for
the author. An archived publication must never be indistinguishable from a live one.

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

### 6.2 Compose ★ — `/studio/compose` (and `?id=` to reopen a draft)

The other highest-scrutiny screen in the product, and the one where the seal ritual (§1.3, §2.5)
gets triggered.

**Compose is a guided sequence, not a wall.** It was a workspace where everything was available
at once, which read as freedom and behaved as neglect: the optional steps were invisible and got
skipped, cards most of all. The canvas now presents one step at a time, in the order a creator
actually thinks in.

| # | Step | Optional | Holds |
|---|---|---|---|
| 1 | Write | no | Headline, dek, and the research body when the format has one |
| 2 | The call | yes | Ticker, direction, target, horizon, with the live quote |
| 3 | Cards | yes | The deck, or the invitation to start one |
| 4 | Video | yes | Choose or record a clip, or continue without |
| 5 | Edit video | yes | Trim, thumbnail, overlays. Present only once a clip is |
| 6 | Tags | no | Primary and secondary tags, the connected piece |
| 7 | Publish | no | Preview, fact-check, access and price, disclosures, promote, publish |

Steps 4 and 5 appear only on the Video format; Research and Post have no video module and are not
walked past two steps that would have nothing in them.

**The first pass guides, and only the first pass.** A step the creator has not reached is
padlocked and not clickable. Reaching the last step unlocks all of them and the rail becomes a
set of tabs. Each step states its own condition in the rail: a tick when it holds something,
`OPTIONAL` when it may be left alone, `EMPTY` when it is required and is not filled in yet.

**One button per step, and its label is what pressing it will do.** There is no separate skip
button. The step works out what the forward button means (`advanceFor` in
`src/lib/compose/steps.ts`): nothing entered on an optional step reads **Skip** and moves on;
enough entered reads **Continue** and moves on; something entered but incomplete still reads
**Continue**, and pressing it says what is missing, in the creator's terms, beside the button, and
stays put. The reasons are specific ("A target price needs a ticker. Add the ticker, or clear the
target", "The Thesis card has nothing on it yet. Write it, or delete it", "Choose a primary tag"),
never "invalid input", and they clear the moment they stop being true. Taking a clip out is its own
control beside Replace on the video step, not a side effect of moving on.

**The template helper on the write step is dismissible.** It is an offer; a creator who does not
want the scaffolding takes it down once and it stays down on their next draft (a localStorage
flag, read as an external store so the server paint matches). Templates remain under Assistant.

**There is no format switcher.** The Video / Research / Post tabs are gone. They asked the creator
to declare up front the thing the sequence exists to decide, and then sat in the header competing
with it. **The format is derived from what the publication contains**: a clip makes it a video, no
clip makes it research. A quiet mono label in the bar states the answer; it is not a control, and
it is hidden below `md` so the primary action fits a 390px bar.

A consequence worth having: a video may now carry a written thesis. The tabs made video and
research mutually exclusive, which the product model never said they were. Text lives on the write
step and clips live on the video step, so a publication can have either, both, or neither.

`short_post` is preserved but no longer creatable here: a draft already stored as a Post keeps its
own canvas and its 300-character limit, and nothing in the sequence converts one. There is an
unwired `postNote()` server action that is the natural home for creating notes.

**The rail does not move with the steps, but it quietens.** The organising principle survives:

> **LEFT is what you build WITH. The steps are what you publish AS.**

The toolbox rail holds the card tray and the AI assistant, because a card has to stay draggable
into the body and onto the timeline. It **exists only on the steps that build something**: write
(a body to drop a card into), cards (a deck to build) and edit video (a timeline to place a card
on). On the call, video, tags and publish steps there is no rail at all; it used to fold to a strip
of two icons there, which was a stub taking width from the work for no reason. On the building
steps it opens by default and can be folded to its icons; a creator who folds or opens it is obeyed
until they move to another step, which then gets its own default back.

The settings rail is gone: access, price, disclosures and promote are step 7, and the Publish
details drawer that used to carry a second copy of them has been removed. Two surfaces holding the
same controls was the thing this change exists to delete.

**Two components render half of themselves** rather than being split in two, so the sequence
costs no duplicated state: `<VideoRung stage="choose" | "edit" | "all">` and
`<LockPublishPanel sections="call" | "publish" | "all">`. The video rung is mounted once across
steps 4 and 5 so the loaded clip and its object URL survive the move, and the Write step stays
mounted (hidden) on every other step so the Tiptap instance and the charts the publish path
screenshots are never lost.

**A frame, a header, two scrolling columns:**

| Region | Size | Holds |
|---|---|---|
| Frame | exactly the room its scroller gives it, measured | Everything below |
| Header (full width, in the flow) | auto | The bar, then the step tracker |
| Toolbox rail (left, scrolls) | `248px` expanded, `56px` as icons, absent on non-building steps | Card tray, then the AI assistant |
| Canvas (centre, scrolls) | `--w-standard` (1200px), fluid; the write step keeps a `60rem` measure | The current step |

Compose is a working surface, not an article. The canvas used to be a reading measure with a
column of dead paper either side at any laptop width; a timeline, a deck and a publish panel all
want the room. Only prose wants a measure, so the write step alone caps its column, with its
heading, its words and its buttons all on the same one.

**Nothing on Compose is sticky, and nothing is pinned to another element's height.** The compose
root is a frame exactly as tall as the room its scroll parent gives it, measured
(`src/lib/compose/frame.ts`: the scroller's inner height, less its padding, plus the negative
margins the shell's breakout already reclaims) and re-measured on resize. The header sits in the
flow at the top of the frame; under it the rail and the canvas are `min-h-0` flex columns that
scroll on their own. Moving between steps scrolls the canvas to its top.

This replaced two earlier shapes, both of which were the same bug. First the bar was sticky and
the tracker in the flow, so the tracker slid under the bar. Then bar and tracker were one sticky
block whose height was measured into a variable the rail stuck under; that broke inside the app
shell because a sticky offset is taken from the scroller's padding-inset edge, so the header sat
2rem below the nav (an empty band) and its bottom edge covered the top of the rail (sliced icons).
Measuring the header's height could not fix a header that was in the wrong place. A frame has no
offsets, so the class of bug has nowhere to live. **Do not reintroduce `sticky` here, and do not
pin anything to `--nav-h` or a measured header height.**

The dev fixture (`/dev/compose`) mounts the workspace inside a copy of the `(private)` shell (top
nav, a scrolling `<main>` with the shell's padding and breakout), because a fixture that let the
window scroll was hiding exactly this. Keep that shell in step with `src/app/(private)/layout.tsx`.

The profile navigation from the `(private)` layout is **not** rendered on Compose. It is not a
tool for making a publication and the left edge belongs to the toolbox. It is removed by wrapping
the layout's rail slot in `<HideOnCompose>` rather than hiding it in CSS, so the streaming
fallback does not hold an empty 240px rail open beside the workspace either.

**Responsive.** Two rails plus a canvas do not fit a laptop:

- `≥ lg` (1024px): both columns. The toolbox collapses to icons on demand and expands again
  from either icon; the card icon carries the deck count as a badge.
- `< lg`: the toolbox becomes a drawer over the canvas, opened from a Toolbox button in the top
  bar that also carries the deck count. The step rail scrolls horizontally rather than wrapping,
  so the sequence stays one line and the page never scrolls sideways.

Everything in a step is **rendered once**, never rendered twice and hidden with CSS: two copies
would break the radio groups and the `label`/`for` targets inside them.

#### The card tray (left, top)

Cards are the publication's **shared asset pool**. They are not part of the video and not part of
the research, and the same card can appear in both, so they live in the rail rather than inside
either module. A creator who wants to build a deck never has to walk past the video recorder to
reach it.

Each tray row is a small draggable card showing a grip handle, the card's name, and a one-line
summary carrying its provenance tag. Name, summary and tag are **derived from the payload**, not
stored, so they cannot drift from the words on the card. A count sits in the section header.

Every row states where the card is currently used: `VIDEO`, `RESEARCH`, both, or `NOT PLACED`. A
card **stays in the tray after it is placed**, because the same card can be in both.

`+ Add a card` opens the library, organised by intent, because "show the risk" is a question a
creator can answer about their own publication and "kill switch" is not:

- **Make your case** — Thesis
- **Prove it** — Path to target, Checklist
- **Compare** — Your edge
- **Show the risk** — Kill switch, Steelman, Catalysts
- **Your own** — Figure

A **Custom** entry lists the same nine formats by shape (Statement, Steps, Checklist, Two
columns, Conditions, Objection and answer, Timeline, Image) for the creator who already knows
they want a timeline and does not want to be asked why. Both routes build the same card.

#### Dragging a card into both

This is the point of the workspace. A card dragged out of the tray can be dropped:

- onto the video timeline's **VISUAL track**, becoming a timed overlay starting where it was
  dropped;
- into the **research body**, becoming an inline figure at that position.

Drop targets highlight while a card is over them (a brass ring and tint). The drag uses a private
MIME type, `application/x-stoa-card`, not `text/plain`, so a target can tell a card from a text
selection *during* dragover, when `dataTransfer` values are unreadable and only the type list is.

A drag needs a mouse. Every tray row therefore also carries a **Place menu** ("Place in video",
"Insert in research") that does the same thing from a keyboard or a phone. Neither gesture is the
fallback for the other; the menu is the only one that works at 390.

Both placements store **only the card's id** (a `cardNode` in the body, a `{ type: "card",
cardId }` visual source on the track). Editing the card once updates it everywhere it appears.
Deleting a card removes its placements with it, rather than leaving a hole on the track and a
placeholder in the prose.

#### The video editor

Built the way the editors analysts already use are built. CapCut, Instagram's Reels editor,
TikTok's editor and Descript are all made for people who do not think of themselves as editors, and
they agree on a shape. This is that shape, in `src/components/compose/video-rung.tsx`:

- **One picture above one timeline.** The stage (16:9, capped at under half the viewport so the
  timeline never drops below the fold) and under it a strip of frames grabbed off the clip. No
  second track, no zoom, no frame-step buttons.
- **Trim by dragging the ends of the clip.** Thick brass brackets at each end of the kept region,
  dragged inward; what is cut is dimmed; the kept range is printed on the strip while trimmed.
- **Things are placed by dragging them on the picture.** Insets and text snap to the nine
  `GridPosition`s the burn-in understands; the 3×3 grid shows only while something is being moved.
  Text is typed on the picture itself (a `contentEditable` that owns its text while focused).
- **Things are timed by dragging the ends of their bar** under the strip. Text bars are plum,
  visual bars brass. A lane appears only once there is something in it, and a second lane only when
  two things overlap in time. A short bar keeps a grabbable middle; its end zones shrink with it.
- **Settings appear only while something is selected.** Selecting a bar or a thing on the picture
  swaps the add row for that thing's controls (text and size; or over-the-picture / full-frame
  cutaway, the card, chart or Napkin fields; from/to; Remove; Done). Nothing selected: the add row.
- **At rest:** play, the time, the strip, and five things you can add at the playhead: Text, Card
  (a menu of the deck), Chart, Visualize, Image. A card can also be dragged from the toolbox onto
  the strip, or placed from the tray's Place menu.
- **The cover** is a folded row under the timeline (the chosen frame, or "Choose"); opening it shows
  the same frames as the strip plus an image upload. Shown at 4:5 as on Explore and the profile.
- **The faithful preview** ("Preview as it will publish") hides every handle, ring and label and
  plays exactly what will ship. Overlays burn in at publish, so this must never drift from the
  published video.
- Keyboard, when the timeline has focus: Space plays, ←/→ step a frame (Shift: ten), Delete removes
  the selection, Escape deselects. These are not buttons.

#### The canvas (centre)

Headline and dek at the top, then the publication's components as stacked modules.

- **VIDEO** — the stage, the filmstrip timeline with trim and overlays, and the cover. See "The
  video editor" below.
- **RESEARCH** — the rich text editor with figures and graphs.

Each module header states what it holds at a glance: `VIDEO ✓ 0:58`, `RESEARCH ✓ 1,840 words`, so
the creator can see what the publication contains without scrolling through it. A module not yet
added is a quiet `+ Add video` / `+ Add research` row, never a fork.

Both modules **stay mounted once added**. Removing a module and adding it back keeps the clip,
its trim, its overlays, and every word.

#### The settings rail (right), top to bottom

1. **The call** — ticker, direction, target, horizon. Optional: a publication may have no call.
   Current price shown for live reference with the upside/downside updating as the target changes.
2. **Access** — free / subscribers / paid unlock with its price.
3. **Promote** — a "Boost on publish" switch. **The cost model is pluggable and deliberately
   unset.** Pricing arrives as a `PromoteModel` (`src/lib/compose/promote.ts`) and the panel
   renders whatever it is handed, including nothing; while there is none it says so plainly and
   offers nothing selectable, so nothing can be sold at a price nobody has agreed. The old fixed
   Boost packages are **not** wired in. The one rule that does not depend on pricing is always
   stated: **promoted content is always labelled as promoted, wherever it appears.** Promotion
   belongs to the publication rather than to composing it, so the same panel is reachable after
   publish from the item in Studio.
4. **Before publishing** — the fact-check and the disclosures, as gates.
5. **Publish** — `Publish & Lock` when a call is being locked. Clicking it opens
   `<LockConfirmModal>` (§2.5) → seal animation.

**Pre-publish fact-check panel:** a "Run fact-check" button; while running, a calm inline loading
state; once complete, the claim-by-claim breakdown with an inline "Add source" input on each
`unproven` claim, or "Mark as opinion" when it is genuinely a judgment call.

**Disclosure checklist**, required, each a real toggle (never a single "I agree" checkbox that
hides real information): position held, compensation tied, views certified. Publish is disabled
until the fact-check has run at least once and every disclosure is *answered* (a Yes with
disclosure is completely valid; an unanswered field is not).

#### The three inks (do not weaken this)

Every value on a card carries its provenance, and the workspace enforces the difference rather
than describing it:

- **plain** — the creator's view. Editable.
- **CREATOR EST.** — the creator's own number. Editable, and switchable to and from plain.
- **AUTO** — an imported market fact. **Read-only, with no ink switch.** The only way a value
  becomes AUTO is by being imported, and the only way it stops being AUTO is by being deleted and
  retyped. That is what makes the tag worth anything to a reader.

A card's tray tag names the strongest claim on it: AUTO outranks CREATOR EST., which outranks
plain.

#### Other invariants

- Overlays burn permanently into the video at publish, so the preview must stay exactly what will
  ship, and the processing state after publish stays.
- Per-card free/locked control stays. The **CTA card is pinned last** and is **derived from
  Access**, not authored, so it cannot be deleted, duplicated, or left behind on a publication
  that stopped being gated.
- Tags stay: one primary that drives discovery placement, up to two secondary, from the closed
  curated list.
- Existing drafts open in the workspace without losing anything: body, tags, access, the call,
  and the saved deck with locked payloads intact.

**AI assist (left rail, under the tray):** generate cards from the thesis, insert a metric, build
a chart, structure my thesis, tighten this, suggest a headline, and **Devil's Advocate with its
credit cost shown**. Each entry **seeds** the Ask panel rather than firing on click: a paid tool
shows its price and then lets the analyst decide, and suggestions are inserted as something the
creator accepts, never silently auto-written, preserving the certification promise that the
published words are genuinely their own.

### 6.3 My Reports — `/dashboard/reports`

Three tabs: **Drafts** / **Locked (open)** / **Resolved**.

**Archived rows** carry a solid-ink ARCHIVED chip beside the content badge, dim the headline so
they read differently while scanning, and spell the state out on the status line: hidden from
the public, and restorable. The content badge lists what the publication contains and is
dropped entirely when it would only repeat the type label.

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
  Explore/Feed, Shared report links, Search)
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

### 6.10 Macro instruments — `/markets/[symbol]`

Gold, crude, Treasury yields and bitcoin are tracked instruments with their own pages, their own
search hits, and validity as a ticker in the call block. They render through `<MacroView>`, which
carries the same annotated calls chart and the same Stoa activity blocks as a stock, and drops the
company facts entirely: gold has no market cap and a Treasury yield has no earnings, so the meta
row is replaced by what the level actually means rather than rendered with blanks.

| Symbol | Instrument | Unit | Provider symbol |
|---|---|---|---|
| `XAUUSD` | Gold | `$ / oz` | `GC=F` |
| `USOIL` | WTI Crude | `$ / bbl` | `CL=F` |
| `UKOIL` | Brent Crude | `$ / bbl` | `BZ=F` |
| `US05Y` | US 5-Year Treasury Yield | `% yield` | `^FVX` |
| `US10Y` | US 10-Year Treasury Yield | `% yield` | `^TNX` |
| `US30Y` | US 30-Year Treasury Yield | `% yield` | `^TYX` |
| `BTCUSD` | Bitcoin | `$` | `BTC-USD` |

**Symbols follow the TradingView convention, not the plain words.** `GOLD` and `WTI` are both real
listed equities already in the instrument table (Gold.com and W&T Offshore), so using them here
would shadow a company page and leave a call ambiguous about what was actually called. Search
carries keyword aliases, so "gold", "oil", "treasuries" and "bitcoin" all reach the right
instrument while an exact equity symbol match still outranks them.

**Bitcoin is a deliberate single exception**, included because it now trades as a macro asset.
Stoa does not cover crypto generally and this table is not the place to start.

**A yield is not a price.** The three Treasury pages carry a brass note saying that a call for the
level to rise is a call for bond prices to fall. Any instrument where "up" does not mean "worth
more" needs that line, or the call block invites the opposite of what the analyst means.

The same rule applies in **every list**, not just on the instrument page. `macroLevelLabel()`
formats a macro level by its own unit and returns null for an equity, so a caller keeps its normal
price formatting: the tape and the theme tables print `4.796%` for a yield and `$4,375.70` for
gold, rather than a bare number sitting next to a fund's share price and reading as one.

**Editorial themes carrying macro instruments.** `MARKET_THEMES` may name a macro instrument or a
curated ETF alongside equities. Theme constituents resolve their name from the instrument table,
then the curated universe, then the macro registry, then `CURATED_ETFS`; a symbol that resolves to
no name is dropped rather than rendered blank. The gold and long-end themes both mix all three
kinds, which is what makes them read as a theme rather than a single instrument with decoration.

**Nothing broken is shown.** Every symbol was checked against the live provider before being
added, and a macro row with no level is dropped from the tape rather than rendered empty. An index
keeps its slot while the provider is quiet, because the slot is the tape's shape; a macro
instrument does not, because Stoa claims to track it.

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
and map it onto the existing `/analyst/[handle]`, `/feed`, `/studio` routes in practice.

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
