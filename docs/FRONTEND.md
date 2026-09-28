# Stoa — Frontend & Design Deep Dive

> **Read this first (updated 2026-09-27).**
>
> **1. The product.** A publication is a video, a brief or a thesis. It may declare a **stance**:
> one ticker and a direction, long, short or hold, frozen with the ticker once published. Nothing
> is graded, scored, locked as a call or resolved. There is no track record, no score, no seal, no
> Verdict type, no entry price, no target and no horizon; grading was retired on 2026-09-24 and
> nothing may rebuild it. Analysts are followed and paid for their judgement, not scored on it.
> The EDITED marker stays, and has nothing to do with grading. This document has been rewritten to
> match; where a section describes a surface that was never built (the original spec's
> onboarding wizard, `/dashboard/*`), it is marked as spec rather than as the site.
>
> **2. The visual system is Direction B (adopted 2026-09-27).** Paper `#FAFAFA`, white cards, ink
> `#101418`; coral for the one live or actionable thing; green and red for direction and price
> only; Bricolage Grotesque, Inter and JetBrains Mono (tickers only) with Heebo for Hebrew; five
> type sizes; pills, 14px panels and circular avatars. **The law is
> [`docs/DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md)**; the reference is
> [`docs/design/direction-b.html`](./design/direction-b.html) (take its look, not its product: its
> sample screens predate the grading removal). `npm run test:contrast` enforces the colour, label
> and mono rules in CI.
>
> The tokens and shared primitives changed first; **surfaces were rebuilt one at a time. Today was
> first (2026-09-27, §3.1b) and the Feed the last (2026-09-28, §2.11).** Until a surface is rebuilt it keeps its old layout in the new colours and type.
> Where a page section below describes an old treatment (a broadsheet rule, a letterspaced
> label), it says so; that treatment is not a rule to preserve.

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

Assumes the backend contract in `docs/BACKEND.md` (schema, RLS, the fact-checker pipeline). Nothing here invents new data — every field referenced below should
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
is: **analysts people follow and pay for their judgement, each piece carrying its stance, its
disclosures and its edits in the open.**

Today (`/home`) was built as a broadsheet on 2026-09-22 (dashed hairlines, square images). That
exception is retired: the page was rebuilt in Direction B on 2026-09-27 (§3.1b).

### 1.2 Where the design comes from

Direction B, "editorial confidence": black and white carry everything, one coral lands the eye on
what you can do, green and red say which way a stance points. Keep what always held: the product
should not look like a trading terminal or a social feed, and what a reader relies on (the
stance, the disclosure block, the edit marker) is plain and never decorated.

### 1.3 The Seal (retired 2026-09-24)

The seal, the lock ceremony and the HIT / MISS stamps were the signature device of the original
design. They are deleted with grading and must not come back in any form, including as
decoration. There is no signature ceremony in the product now.

### 1.4 Design token system

The full law, with every value and the measured contrast, is `docs/DESIGN_LANGUAGE.md`. The
tokens live in `src/app/globals.css`; this is the working summary.

**Colour.** `--paper` `#FAFAFA`, `--surface` (card) `#FFFFFF`, `--surface-2` (well) `#F2F3F5`,
`--ink` `#101418`, `--text-mute` `#5B6470`, `--border` `#E6E8EB`, with dark values for each.
Coral, gain and loss each have a fill tone and a word tone: `--coral` `#FF5A47` /
`--coral-text` `#C8321F`, `--gain` `#12B981` / `--gain-text` `#087A55`, `--loss` `#E5484D` /
`--loss-text` `#C92A31`. `--up` and `--down` are the gain and loss word tones.

- Words in a hue use `text-coral`, `text-gain`, `text-loss` (the word tones). Fills use
  `bg-coral`, `bg-gain`, `bg-loss`, which set black text themselves. White on a fill fails
  contrast and is never used.
- Coral: Subscribe, Follow, Publish, the one primary action, a live recording. Green and red:
  direction and price movement. Everything else is black, white and grey.
- `--accent` is **ink** (the ink button, selected tabs). It is not coral and must not become coral.
- **Errors are red, by a deliberate exception:** `--error` is a crimson held well away from the
  price red, with `--error-soft` and `--error-edge` for error boxes. Only errors, failures and
  destructive hovers use it.
- Other meanings that used to borrow a hue have their own tokens, all ink or grey: `--ok`, `--pending`, `--notice-edge`, `--notice-soft`,
  `--mark-edited`, `--highlight`, `--chart-1..3`.
- `--text-faint` is decoration only (rules, ornaments); it is never a text colour.

**Typography.** Bricolage Grotesque 700/800 for display, headline and title; Inter for reading and
UI with tabular figures on; JetBrains Mono for tickers only; Heebo supplies Hebrew in both stacks.
Six sizes, as Tailwind utilities and classes:

```
display   40-72px  Bricolage 800   text-display   .t-display
headline  24-32px  Bricolage 800   text-headline  .t-headline
title     19px     Bricolage 700   text-title     .t-title
body      15px     Inter           text-body      .t-body, .t-body-editorial
ticker    13px     Mono on a ticker, Inter for captions   text-ticker   .t-meta, .t-ticker
reading   17-18px  Inter, line 1.75  text-reading  .stoa-prose (report body and Compose editor only)
```

Tailwind's default size scale is deleted, so `text-sm` and `text-[11px]` do nothing. No
uppercase, no letterspaced labels. `.num` gives tabular figures in Inter.

**Spacing scale** (4px base unit, used for all padding/margin/gap; no arbitrary values):

```
--space-1: 4px   --space-2: 8px   --space-3: 12px  --space-4: 16px
--space-5: 24px  --space-6: 32px  --space-7: 48px  --space-8: 64px  --space-9: 96px
```

**Radius, by role:** `rounded-button` (pill), `rounded-chip` (pill), `rounded-field` (10px),
`rounded-panel` (14px: cards, menus, dialogs, media), `rounded-inner` (8px: wells, rows, tiles),
`rounded-avatar` (circle). Never borrow another role's radius.

**Shadow:** one elevation value, `--shadow-card`, used sparingly. The trust panels (the
disclosure block and the advice panel) are grey wells with the panel radius since the
publication page was rebuilt (2026-09-27); they are set apart by being fixed in shape and never
brandable, not by a heavier border.

### 1.5 Motion principles

- The product uses fast, quiet transitions (150–200ms ease) for hover/focus states and simple
  fades for content loading: no triggered scroll reveals, no staggered card entrances, no
  parallax. (The one exception is the scrub-based, reduced-motion-safe landing reveal defined in
  `docs/MOTION.md` law 11.) The seal ceremony that used to be the one orchestrated moment is
  retired with grading.
- All motion respects `prefers-reduced-motion: reduce`.

### 1.6 Accessibility floor (non-negotiable, applies to every page in Part 2 without being restated)

- Color is never the only signal — every fact-check verdict, every direction chip, every status
  chip pairs its color with a text label or icon.
- Visible keyboard focus ring on every interactive element (`2px solid var(--ink)`, offset 2px).
- Minimum contrast: every word 4.5:1 on paper, card and well in both themes (large headlines
  3:1), measured by `npm run test:contrast`, not assumed.
- All interactive elements reachable and operable via keyboard, including the fact-check claim
  popovers (focusable, `Escape` dismisses) and the debate thread (standard form semantics, not
  custom click-only widgets).
- Every image and icon-only button carries a real `alt`/`aria-label` that says what it is for,
  e.g. the edit marker reads "Edited Sep 3, 2026, see what changed," not "pencil icon."

### 1.7 Responsive strategy

Three breakpoints, mobile-first:

```
--bp-sm: 480px    (large phone)
--bp-md: 768px    (tablet / small laptop)
--bp-lg: 1200px   (desktop)
```

General rule used throughout Part 2 instead of repeating it per page: **the trust surface (the
stance chips, the disclosure block, the edit marker) never gets simplified or truncated on
mobile** — it may stack above the reading column instead of sitting beside it, but every
disclosure field is present at every breakpoint. Only the *editorial* column (report body,
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
over the page rather than welded to the edge, capped at `30rem` and centred. Five destinations,
always labelled. Its proportions and its motion are copied from the iOS 26 tab bar, measured
in pixels off the Investing.com recording of 2026-09-09 (a 440pt screen at 3x): `20px` side
insets, a `58px` pill, the row of items inset `3px` from its round ends, a highlight of the
whole slot with `17px` corners (measured at 54px and the slot less a point either side, then
taken down a twentieth by eye to `51px` and the slot less `2.5px`), `26px` icons over `10px`
labels. Those are points, not proportions of the screen: iOS keeps them fixed on every
phone width, and so do we.

- **Frosted paper, not a band.** The pill is glass: `--glass` (paper at 55%) over
  `backdrop-filter: blur(28px) saturate(1.6)`, a hairline `--glass-edge` border, a one-pixel
  `--glass-highlight` inset along the top and `--shadow-glass` beneath. The blur carries the
  legibility, not the fill: the heavier the blur, the thinner the paper can be. Plain round
  ends (`999px`). The page shows through
  it blurred and tints it, warm because the fill is paper rather than grey. The solid `--paper`
  fill is declared first and the glass inside `@supports (backdrop-filter)`, so a browser that
  cannot blur gets an opaque paper pill, never a transparent one. Both tokens have a `.dark`
  value. Only chrome that floats over content may use the glass tokens; cards and sheets stay
  opaque.
- **Truly floating.** Nothing sits under the pill but the page. The app shell's `main` scrolls
  edge to edge to the bottom of the viewport and the pill is `position: fixed` over it; there is
  no band. Surfaces that scroll in their own column run under it too: the Feed's wrapper adds
  `.breakout-under-tabs` and every `<ScrollFrame>` carries `.frame-under-tabs`, both of which
  cancel the shell's tab clearance so the frame reaches the bottom of the viewport. The
  clearance then moves inside: the Feed's caption block pads `--tab-h`, `SCROLL_COLUMN` pads
  `--tab-h + --main-pad-y`, and a frame that is its own scroller (the report page, the Storefront
  studio on a phone) pads the same. Content passes behind the glass while scrolling; nothing
  ends underneath it. `frameHeight` counts the frame's own negative margin for this.
- **The current tab is marked by one travelling lens**, `.app-tabs-lens`: a translucent
  rounded rectangle (`--glass-lens`, ink at 12%, 20% in the dark; `17px` corners, squarer than
  the bar's ends, which clip it) that takes the current tab's slot, the same size for every
  tab whatever its label says, so a short label like Today gets the same mark as Explore and
  the mark is always centred on its icon. Each link fills its slot with the iOS stack inside:
  `7px`, a 26px icon, `4px`, a 10px `leading-none` label with `0.1em` tracking, `7px`, with the
  51px lens centred on it; the current icon draws with a heavier stroke, the type stays ink.
  The lens is a single element positioned by `AppTabs` over the current slot (measured,
  re-measured on resize), not a style on each link:
  on a tap it sets off at once (the tapped tab is remembered with the path it was tapped on,
  so the route takes over the moment it changes) and travels to the new slot over
  `--dur-ceremony` on `--ease-in-out` (the recording's capsule takes about a third of a second;
  in-out is the curve for a thing moving across the screen, law 1), stretching lengthways on
  the way (`scale 1.35 0.94` at the midpoint) and settling on arrival. Only `transform` animates; the width is set instantly, and the
  capsules are within a few pixels of each other so the change is invisible. Under
  `prefers-reduced-motion` it jumps. A label must stay narrower than its slot less `16px` at
  390px (Markets is the widest) so the lens keeps air either side of it.
- **Shrink with the scroll.** The pill does not flip between two sizes: it moves with the
  scroll. Scrolling down shrinks it towards `scale(0.92)` about its bottom edge over 64px of
  scroll, scrolling up opens it out by the same amount, and it follows a few frames behind (an
  80ms time constant), so a Feed card snapping into place still reads as a glide. Once the
  scroll has been still for 140ms it settles gently to the nearer size, never resting halfway.
  Within 64px of the top it can be no smaller than the distance left, so the top of a page is
  always full size, and opening a new page opens it out. Under `prefers-reduced-motion` it stays
  at full size. A deliberate exception to the "do not animate nav" rule in `docs/MOTION.md` §A.4,
  asked for by name; the numbers are in the AppTabs row of MOTION.md §A.3. The travelling lens
  above is the only other thing in the nav that moves.
  It listens on the document in the capture phase (scroll events do not bubble), so any
  scroller at least half the screen tall drives it: `main`, the Feed's own reader, Today's
  columns. Sideways tracks, dropdowns and tables do not. Before 2026-09-28 it listened only to
  `main`, so the Feed never shrank it.
- **Never jumps, never flutters.** The arithmetic is `src/lib/nav/scroll-shrink.ts`, a pure
  function with tests (`npm run test:nav`); `--shrink` is written straight to the pill each
  frame, not through React state. A resting thumb's two-pixel twitch moves the pill by less than
  a pixel.
- **Never covers content.** Because the pill overlays the page, the scroller reserves the
  clearance: `.has-app-tabs main` carries `--main-pad-y + --tab-h` as bottom padding on phones.
  A page that cancels main's padding to break out must cancel the **top** only; cancelling the
  bottom eats this clearance and puts the last row under the bar. The exceptions are
  `.breakout-under-tabs` and `.frame-under-tabs` above, for a surface that carries its own
  clearance.
- The pill's own rules live inside the `max-width: 767px` block. They are unlayered, so at
  desktop widths they would otherwise beat the element's `md:hidden` utility.

**Installable PWA.** The phone site is an installable app, not a native binary. Manifest
(`src/app/manifest.ts`): name Stoa, `display: standalone`, `start_url` `/feed`, paper
`#FAF8F4` theme, scope `/`. Icons are maskable 192 and 512 plus the Apple touch icon.
`appleWebApp` is on the root layout. A dismissible install strip (`InstallHint`) shows
only in the browser after cookie consent, never inside the standalone window, and sits
above `--tab-h`. Explore's watch overlay portals at `z-70`, above the tab pill (`z-40`).
The app-shell worker (`public/sw.js`) caches `/offline` and hashed `/_next/static`
assets; it never intercepts HLS, mp4, Bunny, or `/demo/` clips. Google and Apple OAuth,
and PayPal returns, stay on the production HTTPS origin so the session lands back in the
standalone window.

### 2.2 `<TrackScoreBadge>` (retired 2026-09-24)

Deleted with grading, along with its `MoatBadge` alias. An analyst appears as an avatar and a
name; the one number shown about an analyst is the public profile's audience line (followers,
and members if the analyst opts in). Nothing takes the badge's place.

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

Rendered as a grey well (`bg-surface-2`, `rounded-panel`) headed "Disclosure", the rows
separated by space rather than rules, identical for every analyst and on every page. Each row is a fixed-format chip,
not free text, specifically so a creator cannot write persuasive copy into their own disclosure.
If `compensation_tied = true`, the second row expands one line to show `compensation_detail`
verbatim, in `--text-sm`, no styling flourishes.

This is the one component in the entire product explicitly *not* covered by a creator's branding
controls (§ Page Branding, Part 3). State that constraint directly in the component's own code
comments for Claude Code's benefit: **never accept a theme/color prop on this component.**

### 2.4 `<ReportGate>` (replaced `<PaywallGate>` on 2026-09-27)

The locked section of a publication a reader may not read (`src/components/report/report-gate.tsx`).

- The page is built on the server without the body (RLS returns none, and the page never asks
  for it for a gated reader), so the fade is drawn from fixed filler words, blurred past reading,
  not from the body. The reading time and "N more minutes" are counted on the server with the
  service key (`gatedReadMinutes`); only the number leaves.
- Below the fade, a grey well: "The rest is for subscribers." (or "The rest of this piece is
  $X."), a line saying how much is left, then the offer. **Subscribe is coral**; a one-time
  unlock is ink on its own and ghost beside Subscribe (a paid piece members may also open).
- Signed out, the buttons show the real offer with its price and go through sign-in with
  `?next=` back to the piece. A quiet line names the separate platform fee and offers Sign in.
- A sealed card anywhere on the page scrolls to the gate (`#report-gate`).

### 2.5 `<LockConfirmModal>` (retired 2026-09-24)

Deleted with grading. Publish is one press: there is no lock confirmation, no ceremony, and
nothing to count toward a score.

### 2.6 `<FactCheckLayer>` — inline annotation system

Wraps rendered report body text. Each `claims` row (from the backend schema, using
`char_start`/`char_end`) gets rendered as an inline `<mark>`-equivalent span with:

- A 2px underline in the claim's tone (`--ok` fact / `--pending` unproven / `--text-mute`
  opinion / `--error` contradicted; the label names the verdict) — underline, not background highlight, so long-form
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
- Threaded replies below, standard comment list (author avatar `sm`, name, timestamp, body text)
- Input at the bottom: plain textarea + "Reply" button — no rich formatting, this is meant to be
  quick back-and-forth, not another editor
- Empty state copy: *"No replies yet. Be the first to weigh in on this claim."*

### 2.8 Status on a publication

A publication is a draft, published or archived; nothing is open, resolved, hit or missed. Drafts
are creator-facing only. An archived publication carries a solid-ink ARCHIVED chip wherever it
still appears (§5.3, §6.3). The per-call `<StatusChip>` (Open / Hit / Miss) is retired with
grading.

### 2.9 Buttons, inputs, toasts: base component notes

Use `<Button>` / `buttonClass()` from `src/components/ui/button.tsx`; do not hand-style a button.

- **Ink** (`variant="ink"`, the default): ink pill, paper text. The ordinary action.
- **Coral** (`variant="coral"`): Subscribe, Follow, Publish, or the one primary action on a
  screen. At most one per view; black text by construction.
- **Ghost** (`variant="ghost"`): outlined pill, for the second action beside ink or coral.
- **Plain** and **subtle**: text-only, and a grey well, for toolbars, filters and dismissals.
- **Destructive action** (cancel subscription, delete draft): a ghost or plain button whose hover
  uses the error crimson (`--error`); the confirm dialog carries the weight, never a filled red button.
- **Inputs:** `rounded-field` (10px), never a pill.
- **Toast notifications:** bottom-center on desktop, bottom-full-width on mobile, `--ink`
  background, auto-dismiss 4s, always paired with an icon (checkmark / info).
- **Copy voice for every button, toast, and empty state:** active voice, names the action from
  the user's side of the screen, keeps vocabulary identical across trigger → confirmation (a
  button labeled "Publish" produces a toast that says "Published," never "Submitted
  successfully"). Errors state what happened and how to fix it, without apologizing or hedging.

### 2.10 `<PlaceholderThumb>` — the generated stand-in for a video thumbnail

One picture, drawn twice: once in the browser as a React component
(`src/components/ui/placeholder-thumb.tsx`), once as pixels for the demo video clips
(`scripts/demo-video-frames.ts`). They must stay identical, so the same analyst looks the same
whether a surface is showing their placeholder or playing their clip. **Change one and you have
to change the other**, then regenerate and re-upload the clips.

- **Colour** comes from `analystColor()` in `src/lib/design/analyst-color.ts`, seeded on the
  analyst's **id**, never their handle or name, so a rename does not change their colour. Eight
  muted tones, deliberately excluding gain green, loss red and coral: those carry direction and
  action and must never be spent on decoration. Sage is greyer than gain, clay browner and softer
  than loss or coral, so a placeholder can never be misread as a direction or a button.
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

- **Stage:** On a phone the clip fills the space from the top nav to the bottom of the viewport,
  running underneath the floating glass tab pill (object-cover, chrome overlaid on the picture;
  the caption block pads itself clear of the pill with `--tab-h`). On desktop it stays a 9:16 height-bound card centred on `--paper`.
  The clip is panel 0 of a horizontal track and the publication's evidence cards are the panels
  behind it, so sideways movement is movement through the publication.
- **Two axes, one gesture at a time.** Both axes are native scroll-snap, and each container
  scrolls on exactly one axis: the reader is `overflow-y` only, the evidence track is
  `overflow-x` only. That single fact is what makes the gestures behave. The browser locks a
  touch to its dominant axis by itself, so a dominant-x swipe reaches the track, a dominant-y
  swipe reaches the reader, and a diagonal resolves to whichever won rather than doing both or
  neither. Leave `touch-action` alone: pinning the track to `pan-x` would stop a vertical swipe
  that starts on the video, which is most of them.
- **Contain each container on its own axis only.** The reader is `.scroll-area` (contained
  both ways: it is the vertical scroller, and nothing should chain out of it into the page).
  The track is `.scroll-area-x`: contained sideways, open vertically. Never `.scroll-area` on
  the track. Chrome and WebKit cut the scroll chain on any axis marked `contain`, whether or
  not the element can scroll on that axis, so a contained track swallows every vertical wheel
  or swipe that starts over the video and the Feed sits on its first publication. Firefox
  chains regardless, which is why the bug showed for some readers and not others: it needed
  Chrome or Safari and a first publication that has evidence cards (a track with one panel is
  not a scroller, so a card-less publication scrolled fine). The same rule applies to every
  sideways scroller inside a page: wide tables, strips and rails use `.scroll-area-x`.
- **The height is measured, the token is the guess.** `.feed-snap` reads `--feed-h`, which
  `<FeedSurface>` writes from `useFrameHeight` (the room its scroller gives it, the same
  measure as every other frame), and falls back to the calc from `--app-h`, `--nav-h` and
  `--tab-h` for the server paint and whenever the measurement is too small to be a reader.
  The tokens alone are one pixel off (the nav's border is not in `--nav-h`), enough to give
  `<main>` a pixel of scroll under the Feed, and a token can be wrong in ways a measurement
  is not. `--app-h` itself is `100vh` first and only then `100dvh`/`100svh` where supported,
  so the shell always has a definite height. The Explore overlay keeps its class height:
  it is the viewport.
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
- **Direction B (2026-09-28).** The video fills the stage and everything else sits small and
  light on it. Rounded corners, no hairline rules, no uppercase labels; the ticker chip is the
  only mono, coral is only on Follow, green and red only on the direction.
- **The dateline:** trending or new, the type, the date and the length
  (`Trending · Thesis · Aug 22, 2026 · 0:58`), in sentence-case Inter. On desktop it is the strip
  above the frame; on a phone it sits on the picture at the top left, with the mute control at
  the right of the same row. The ticker is not in it: it is on the stance card, in its own face.
- **The stance card** (`<StanceCard>`, `src/components/feed/stance-card.tsx`): a small paper card
  under the dateline. A stance is the ticker chip and the direction word (▲ Long in the gain
  tone, ▼ Short in the loss tone, Hold quiet). A ticker with no stance names its sector beside
  the chip; a publication with no ticker shows its theme or sector alone; with none of those no
  card is drawn, never an empty one. It stays paper in dark mode (`.keep-paper` re-declares the
  light tokens inside it): the picture does not change with the theme, and a dark card reads like
  the clip's own chips.
- **Stoa's chrome versus the clip's.** Demo and real clips carry their own trading-interface
  chips (translucent pills, coloured words straight on the picture). Everything Stoa draws is
  distinguishable from them: the stance is an opaque paper card with the card shadow, never a
  pill on the video; the controls are plain white icons or dark round buttons in fixed places.
- **At the bottom, in order:** the headline in Bricolage (headline size on a phone, title size
  in the desktop frame, three lines at most); the analyst's circular face ringed in white, the
  name, the follower count (`19.2K followers`; the handle when there are none; it moves with
  the reader's own follow) and the coral Follow (Following is a white outline); the scrub bar
  (`<ScrubBar inline>`); then like, discuss, save and share as white icons, with the pager
  (`1 / 7`) at the right end. The pager is a button: it jumps to the closing card.
- **The scrims** are sized from the chrome they carry, not from the frame. The item measures its
  top and bottom chrome (`--chrome-t`, `--chrome-b`); the bottom scrim is strong behind every
  line of text (about 5:1 for the headline on a pure white frame) and fades over 5rem above it,
  so a one-line headline darkens less of the picture and none of it reaches the middle, where the
  face is. The top scrim is strong behind the dateline row only.
- **The analyst's overlays keep clear of the chrome.** The same measurements go to
  `<OverlayLayer clearTop clearBottom>`: the top and bottom rows of the overlay grid move inside
  the chrome instead of under it. Sizes and the middle row are untouched, and Compose's preview
  and the report page, which pass nothing, draw exactly as before.
- **The whole picture pauses.** One button covers the clip; the chrome above it lets taps through
  except on its own controls.
- **On an evidence card** the picture is gone, so the headline (one line) and the pager sit on
  paper beneath the card, and the card is padded clear of them and of the tab pill.
- **Full-screen hosts.** The Explore overlay and the stories have no nav above and no pill
  below, so they pass the phone's safe areas in (`--feed-safe-top`, `--feed-safe-bottom`) and the
  chrome pads for the notch and the home bar. The Explore overlay's back button sits top-left on
  the picture; on a phone the dateline starts beside it.
- **Where the stance comes from.** The ticker is `reports.ticker` and the direction
  `reports.stance`, read through `stanceChips()` in `src/lib/db/publication-row.ts`; the theme
  or sector anchors a publication with no ticker.
- **Keyboard:** up/down between publications, left/right through cards, a double right to the
  unlock card, M to mute, Space to pause.
- **Autoplay:** only the publication in view mounts a player, which is both the autoplay rule and
  the performance rule. A poster covers the frame until playback is under way, because the embed
  is opaque black while an HLS stream starts.
- Bunny's own player chrome is switched off. It draws a control bar exactly where the identity
  band goes, and the surface supplies its own progress, mute and pause.
- **Hosts.** The same surface runs inside other surfaces rather than being copied: the Explore
  overlay (`embedded`) and Today's faces (`<FaceStories>`, section 3.1b, "The faces"). A host
  can size the room itself (`snapClass`), keep its own close control (`backButton={false}`;
  Escape still calls `onBack`, and waits while Discuss is open), take the sideways axis
  (`sideways="host"`: the evidence track no longer pans under a finger and ignores left/right,
  its chevrons and pager still move it), start muted every time without touching the Feed's
  remembered sound (`rememberSound={false}`), log under its own name (`surface`), and send
  sign-in back to itself (`signInNext`). `onActiveChange` reports which piece is showing.
  `onEnd` replaces the end-of-feed card with the host's `endSlot` and is called when the
  reader scrolls into it or the last clip plays through; with it, every clip that plays
  through moves on to the next by itself. "Through" means the bar reached its end or the clip
  went back to its start on its own, only after it has played in this visit and never under a
  finger on the bar.
- **Nothing to play.** A publication with no clip (a written piece, `clipId` null) draws a
  readable card on the stage (headline, deck, Read the piece; the type and date are on the
  dateline) inside the usual stance card, analyst and actions, with no scrub bar, mute or pause. A clip the reader may not
  stream (`watchGated`: signed out) keeps its poster behind a card with Sign in to watch. The
  Feed page itself never receives either; Today's faces do.

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
- **Stoa's own chrome, the same as the Feed's.** A tap on the picture pauses
  and resumes, the mute sits top-right, and the scrub bar runs along the
  bottom edge (`<ScrubBar>`, shared with the Feed, the Explore and Dispatch
  cards and the landing lead; always white, since it is always on a picture,
  and `inline` in the Feed's bottom block). The browser's control bar used to sit here; it
  drew over the bottom of the frame and could not sit under the overlays.
  Bunny's iframe fallback keeps Bunny's own controls, since nothing outside
  it knows the playhead.
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
   video. The components own this themselves (Today's `CardImage` and the
   Markets row thumbnail return `null`, and carry their own link so a call
   site cannot leave an empty anchor behind).

   This holds on every surface: Today's lead and bands, the profile's lead
   and grid, Markets publication rows (which render through Today's row), the
   landing lead, Explore and the Feed. Explore and the Feed only ever query
   publications that have a clip, so the question does not arise there.

   **Every Today band that can carry a frame does.** The lead draws the 4:5
   picture, Worth your next minute square frames, and the story rows a small
   square at the row's end (`ClipFrame` in `src/components/today/today-bits.tsx`).
   Markets rows keep `ClipSlot` (`src/components/today/clip-slot.tsx`).

   One band deliberately carries no frame: **Market news** is wire copy, not
   Stoa video. (The Verdicts band, which carried the seal instead of a frame,
   is gone with grading.)

2. **`ClipThumb` draws every clip poster**, falling back to `PlaceholderThumb`
   only for a clip whose poster frame has not been produced yet. That is a video
   with no still, which is not the same thing as a publication with no video.
   `ClipThumb` exists because Bunny's pull zone refuses requests with no
   `Referer` and Next's image optimiser fetches server-side, so clip posters
   never go through `next/image`.

**Selection is a separate question from rendering.** Today ranks by velocity,
and a ready clip multiplies that score (`src/lib/today/video-preference.ts`).
Stoa's output is the creator's face and voice, so the surface should lean
towards what a reader can watch.

- **A lean, not an override.** The weight rides on top of the velocity a
  publication earned, so a written report that is genuinely the strongest still
  leads. It settles near-ties towards video and leaves a clear winner alone.
- **Written work keeps its own band.** Worth your next minute takes clips only;
  Worth reading takes written pieces first. (Until 2026-09-27 a mixed Trending
  band capped video's share instead; that band and its cap are gone.)
- **Your Desk** stays newest-first, because it is the reader's own memberships
  and follows and chronology is the promise there.

A profile's lead is the analyst's newest publication (or the pinned one),
whatever its form: the page argues for a subscription with the latest of the
work, so it no longer leans towards video (changed 2026-09-27). Every band
obeys rule 1 when a chosen publication turns out to have no clip.

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
- **Quiet and typographic**, matching the page: sentence case,
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
wherever the publication appears. The marker is **quiet grey (`--mark-edited`), never an alarm colour**: an analyst correcting themselves in the open is doing the right thing, and the interface reads that way rather than
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

The stance (the ticker and its direction) can never be edited once published, and the panel
opens by saying so. The marker is independent of grading: it predates the removal and survives it
unchanged, because it is about the words, not about whether anyone was right.

### 2.15 `<ArchiveDialog>` and `<DeleteDialog>` — one is reversible, one is not

These sit one row apart in the Publications list and **must never read alike**.

- **Archive** is offered on every published publication. Recoverable, and its copy says so.
- **Delete** is offered only on a publication that declares **no stance** (and never carried a
  call from before the removal) and that **nobody has bought**. Otherwise it is absent, not
  present and refused (`deleteBlocker` in `src/lib/studio/delete-rule.ts`).
- **A draft** is different: it was never published, so there is nothing on the record to protect.
  A draft offers Delete with a one-line confirmation and no typed word, never Archive, and never
  Promote (there is nothing out to promote). The permanence rule exists so an analyst cannot
  quietly bury a stance they took in public, and so a buyer never loses what they paid for; a
  publication with neither is content, and a creator may remove their own content.

The delete dialog does not reuse the archive copy with a harder verb. It names what is destroyed
inside an **error-bordered** block (`--error-edge`), states that archive is the reversible option,
and requires the creator to type `DELETE` before the confirm button turns on.

---

### 2.16 Going back: `<HistoryDepth>` and the phone's own swipe

`<HistoryDepth>` lives in `src/components/layout/history-depth.tsx` and is mounted once in
`src/app/providers.tsx`.

- **Knowing what is behind a page.** Every history entry carries its depth in
  the app (`stoaDepth`, `src/lib/nav/back.ts`): `installHistoryDepth` wraps
  `pushState` and `replaceState`, so any push (the router, Explore's
  `?watch=`, the stories overlay) is one deeper and a replace keeps its
  depth. `canPopHistory()` is true above depth 0. Compose's Back uses it.
  (Until 2026-09-27 it read the Pages Router's `idx`, which the App Router
  never writes, so it was always false.)
- **Swiping back is the phone's, not ours.** Stoa draws no back gesture of its own. iOS gives
  a web app added to the home screen its own back swipe, the one where the previous page
  slides in under the finger, and so does every browser tab. It runs from the edge the phone's
  language reads from: the left on an English iPhone, the right on a Hebrew one. A website cannot
  turn it off, flip it, or match it (it shows a picture of the previous page, which a page cannot
  draw). From 2026-09-27 to 2026-09-28 Stoa had its own left-edge swipe with an arrow in the
  installed app (`EdgeSwipeBack`); it was removed because on a Hebrew iPhone it was a second
  gesture beside iOS's, and on an English one it would have gone back twice.
- **So the rule is: every place you can go back from is a history entry.** Every surface is
  reached by a push (a link, `router.push`, or `history.pushState` for an overlay), never a
  replace, so the phone's swipe lands exactly where the on-screen Back would. The first page the
  app opens on has nothing behind it, so the swipe does nothing there; the tab bar is the way out.
- **Overlays are history entries.** The stories overlay and Explore's video overlay each push
  one entry, so the swipe closes them and lands where the reader was. The stories overlay
  leaves drags that start within 24px of either edge to the phone, so a back swipe never
  changes analyst as well.
- **Compose.** Its own links go through the unsaved-work dialog. The phone's swipe cannot be held
  for a dialog (the previous page is already on screen when the page hears of it), so a draft
  saves on the way out, the dialog's own default. An unsaved edit to a live publication is not
  saved: that would file a public EDITED marker the creator did not ask for.

---

## PART 3 — PUBLIC PAGES (logged out)

### 3.1 Homepage — `/` (public Stoa Dispatch)

Logged-out visitors land on the **public** daily Dispatch — same editorial design as
[dailydispatch.app](https://www.dailydispatch.app/). Signed-in users are redirected to `/home`.

**Layout, top to bottom** (centered column, max-width ~672px, `--paper` background):

**Masthead**

- Wordmark: lowercase Bricolage **stoa** + a **Dispatch** label
- Hairline rule
- Dateline row (Inter, sentence case): `Issue №{N} · {WEEKDAY, MONTH DAY, YEAR} · {N} min read`

**Lead story** — centered Bricolage headline, optional dek, author row, ticker, target, Read link

**Secondary list** — "Also in this issue" — dense wire (not cards)

**Today's Record** — ledger table; hidden when empty

**How it works** + **For creators** (public only)

**Backend:** `GET /api/dispatch` (no personalization). Homepage server-renders via `buildDispatch(false)`.

---

### 3.1b Today — `/home`

Stoa's daily page, **rebuilt in Direction B on 2026-09-27** from the Today screen in
`docs/design/direction-b.html` (its look and structure; not its verdicts band or its call cards
with targets and horizons, which do not exist). The broadsheet of 2026-09-22 (nameplate, dashed
rules, square images, 12-column grid, eyebrows) is gone.

Files: `<TodayPage>` (`src/components/today/today-page.tsx`); the lead in `today-lead.tsx`; the
faces row in `today-faces.tsx`; the bands in `today-sections.tsx`; the shared pieces (tags,
byline, clip frame, story tile, story row, play disc) in `today-bits.tsx`; the rail in
`today-sidebar.tsx`; the frame in `today-shell.tsx`. Data: `buildTodayPage` in
`src/lib/today/build-today-page.ts`, payload `TodayPagePayload` in `src/lib/today/types.ts`.
Styles: a handful of `.today-*` rules at the end of `globals.css` (band spacing, the play disc, the
duration on a picture, the fresh-post ring, the desktop frame); everything else is utilities and
the primitives. Fixture: `/dev/today` (`?state=empty` signed out, `?lead=written`,
`?lead=processing`, `?faces=quiet`). Its faces open stories over the Feed fixtures, grouped
by analyst; Dana's work is written only, and signed out every clip is gated.

**Top to bottom:**

1. **"Today."** at display size (`t-display`) and a plain dateline: `Sunday 27 September · 14 new
   publications` (publications in the last 24 hours; `Nothing new yet today` when there are none).
   On a phone the `Lists` control (ghost pill) sits at the right of the dateline.
2. **The lead**: the day's strongest publication by velocity with the video lean (below),
   whatever its form. With a clip: two columns, the 4:5 picture with a white play disc on one
   side (the whole picture links to the publication), on the other the headline at display size
   (headline size past 80 characters, so a long one does not run to seven lines), a three-line
   deck, the analyst's face with name, beat and time, and the stance. On a phone it stacks,
   picture first. **No clip, no frame**: the headline takes the width. A clip still processing
   keeps its frame with the processing state and no play disc.
3. **The faces**: analysts who posted in the last 24 hours, newest first (up to 16), a 72px
   circle with first name and beat beneath (`profile_config.specialty`, else the sector or theme
   of their newest piece). A coral ring (`.today-ring`) marks anyone with something the reader
   has not seen, the way stories are: their newest piece is later than the last one the reader
   watched them through to (`localStorage` `stoa:today:watched`, per analyst; marks older than
   30 days are dropped). It stays through reloads and visits until the reader watches that
   analyst through, then clears and returns only when they post again. Only work posted after
   this browser first saw Today can ring (`stoa:today:since`, stored once and never moved), so a
   first visit does not ring everyone; a browser from the earlier rule seeds it from its old
   `stoa:today:last-looked` stamp, which is then removed. This device's memory only. On a quiet day with no posts in 24 hours the row
   shows the most recent posters under **Recently posted** instead of claiming today. The phone's
   one sideways scroller; on a desktop the faces wrap.

   **A face opens stories, not a profile.** Each face is a button; tapping it opens
   `<FaceStories>` (`face-stories.tsx`) in a portal over Today. Today is never left: nothing
   navigates, the page underneath keeps its scroll, and focus goes back to the face on close.
   The analysts' recent work loads once, on the first hover, focus or tap of any face, through
   the `loadFaceStories` action (`src/app/actions/today.ts`): per analyst, published pieces
   within 7 days of their newest, at most 6, newest first, video and written alike, in the
   Feed's publication shape (`reportsToPublications`). Inside:
   - The Feed's own player (`<FeedSurface>` as a host, section 2.11), one piece at a time.
     Up and down (swipe, wheel, arrow keys) moves through this analyst's work. Sideways (a
     finger's swipe, a trackpad's two-finger swipe, left/right arrows, and on a desktop the
     named buttons either side of the stage) moves to the next or previous analyst in the row.
     A clip that plays through carries on to the next piece; past an analyst's last piece
     ("Up next: Kai Tanaka") comes the next analyst; past the last analyst the overlay closes.
     Analysts whose work came back empty are passed over.
   - A fixed header: one segment per piece (filled up to the one showing), the analyst's
     face and name with `2 of 5`, and the close control. The player takes exactly the rest of
     the height (`.feed-snap-stories`, `--stories-head`).
   - Closing: the X, a downward pull from the first piece while at the top, Escape, or the
     browser's Back. Opening pushes one history entry (`stoaStories`), so Back closes the
     overlay instead of leaving Today, and the X goes back through that entry.
   - Sound always starts off, whatever the reader chose on the Feed; turning it on lasts
     until the overlay closes.
   - Written pieces are readable cards on the stage (section 2.11, "Nothing to play"), so a
     face who posted only prose still opens. Signed out, clips arrive gated (poster and Sign in
     to watch), because streaming is account-gated wherever the Feed player runs.
   - Reaching an analyst's last piece is watching them through: their ring clears.
4. **Worth your next minute**: four publications with a ready clip, each a square frame with its
   duration, the title (`t-title`), the stance or tag and the face and name. Four across on a
   desktop, two on a phone.
5. **Your desk** (signed in): six newest from the analysts the reader follows or supports.
6. **More on {theme}**: up to three on the lead's ticker, sector or theme. Real kin only; never
   padded.
7. **Worth reading**: four more, written pieces first. The route onto Today for a thesis that is
   not the lead.
8. **Market news**: wire headlines, source and time, two columns on a desktop (streamed,
   `<TodayNewsSlot variant="today">`; Markets keeps its band form, `<TodayNews>`).

Bands 5 to 7 draw **story rows** (`StoryRow`): the face first, the title, name and time (plus
Trending or New when the lifecycle says so), the tags, and a small square frame at the end when
the publication has a clip. Two columns on a desktop.

**Rules.** Bands part by space (`.today-band`: 56px phone, 72px desktop), never by rules. Every
image and card is rounded (`rounded-panel`, `rounded-inner` for the row thumbnail). The only mono
is the ticker chip. Coral appears on the rail's `+ Follow` and the fresh-post ring, nowhere else;
green and red only on the stance chip and the rail's day change. **Tags:** a publication with a
ticker shows `TickerChip` plus `StanceChip` when it declares a direction; one without shows its
theme (or sector) as a `ThemeChip`; one with neither shows nothing, never an empty chip. **A band
with nothing in it is not drawn**, heading included; the verdicts band is gone and nothing
replaces it.

**The rail** (`<TodaySidebar>`): trending and popular creators and tickers, memberships,
following, your tickers. Rows parted by space: a 24px face and the name (creators) or a ticker
chip and the day change (tickers), Trending or New in muted text, and a quiet coral
`+ Follow` where the reader does not follow. No solid buttons, no rules, nothing scrolls sideways.
On a phone it is a drawer behind `Lists`.

**Layout.** On a desktop the rail (248px) and the page are two columns that scroll on their own
inside the room under the nav (`.today-frame`, `.today-column`, measured by `useFrameHeight`, see
`src/lib/layout/frame.ts`). On a phone the page is one document scroll inside `<main>`, which
runs full height behind the floating tab bar and pads its end clear of it. Nothing scrolls
sideways except the faces row on a phone (the article clips its bleed with `overflow-x: clip`).

---

### 3.2 Explore — `/explore`

As built, Explore is a wall of faces: video publications as poster tiles, sized by the lifecycle
model, each opening the Feed at that publication (`docs/PRODUCT_MODEL.md`). It filters by ticker
and sector through `<FilterPicker>` (§2.13) and by free or paid. There is no score filter and no
"highest score" or "highest upside" sort: nothing is scored and no publication carries a target.
Empty filters say so and offer to clear them.

---

### 3.3 Public creator profile — `/analyst/[handle]` (rebuilt 2026-09-27)

A profile is a **storefront**: who this is, what they cover, their work, and
subscribe if you like how they think. The argument for subscribing is the body
of work, never a record of accuracy: there is no track record, no Receipts, no
resolved calls and no hit rate, and nothing takes their place. Letterboxd is
the shape: you follow a person for how they think, and their page is the
evidence. Built in `AnalystProfileView` (`src/components/profile/analyst-profile-view.tsx`)
from `buildProfileView` (`src/lib/profile/build-profile-view.ts`); the owner's
copy at `/profile` renders the same view. Fixture: `/dev/profile`
(`?state=new|one|empty`, `?pinned=r4`, `?clip=processing`, `?viewer=self|subscribed`).

**Hero** (`StorefrontHero`, shared with the Storefront editor's preview in
compact form):

- A large circular face (88px on a phone, 128px from `sm`), the name at display
  size with the verified check, the one-line specialty (`profiles.headline`)
  and the bio in muted text under it.
- The **audience line** as a quiet meta line: `@handle · 4.3K followers · 214 members`.
  Members only when the analyst turned it on (`profile_config.show_member_count`).
  This is the only number on the page; publications show no view counts.
- Actions: **Subscribe** is the one coral fill; **Follow** and **Share** are
  outlined (ghost). A viewer who already subscribes sees an outlined
  **Subscribed** linking to `/subscriptions` instead of the coral button. The
  owner sees only Share and a line linking to the Storefront editor. There is
  no sticky action bar on a phone (it sat behind the floating tab pill), and
  never a message or DM entry point (§5.4).

**Lead:** the pinned publication (`profile_config.pinned_report_id`),
otherwise the newest by publication date, labelled "Pinned" or "Latest".
With a clip: a 16:10 frame with the play disc beside the headline, deck,
stance chips and a meta line (type, what it carries, date). Without one: no
frame, the headline across the width. A clip still processing keeps its
frame and says so.

**More from {first name}:** everything else, as a grid (2 columns on a
phone, 3 from `md`, 4 from `xl`), newest first, 24 at a time with Show more
(up to 500 publications are loaded).

- A video is a 4:5 poster tile (`ClipThumb`, the analyst's `PlaceholderThumb`
  colour only while a poster is not made yet, the processing frame while
  the clip itself is), then its headline, stance chips and meta line.
- A written piece is a type-only card: meta line, the headline in extra-bold
  display type, the deck and its chips. No image area, as tall as its words.
- **Narrowing** is two quiet `<FilterPicker>` menus beside the heading,
  Subject (tickers and themes covered) and Type (videos, briefs, theses),
  never a row of tabs. They appear only once there are six or more
  publications and more than one option. With a filter chosen the grid shows
  every match, lead included.

**Sparse by design:** one publication is the hero and the lead, nothing else;
two is the lead and a single tile. No filler, no encouraging empty panels.
With nothing published the page says "Nothing published yet."

The storefront's own style (headline face and paper texture, §6.7) is applied
to the whole page.

---

### 3.4 Report public preview — `/@handle/[report-slug]`

**Layout:** identical page shell to the full Report Detail Page (§4.3) for everything above the
fold — ticker strip, creator strip (avatar, name, Follow), the stance chips (fully visible, never
gated), the `<DisclosureBlock>` (fully visible, never gated), and the fact-check summary strip
(fully visible, never gated).

Only the report body is gated: a gated reader's page is built without it and ends in the locked
section (`<ReportGate>`, §2.4), which fades filler, never the body, into the offer.

**Bottom bar:** Share button (copies/opens a native share sheet with this exact URL — this page
*is* the shareable object, so there's no separate "public preview link" to generate), and a small
"New here?" prompt with **"Sign up"** for anyone who wants to follow/subscribe before unlocking.

---

### 3.5 How It Works / Pricing — `/how-it-works`

Single long-scroll marketing page, contained width (~760px), `--paper` background:

- Restates the three-step "how it works" from the homepage in more depth, one section each, each
  with a supporting screenshot-style illustration of the actual component in question (the
  fact-check layer, the stance chips, the disclosure block)
- **For investors** subsection: explains subscription vs. per-report pricing from the reader's
  side, links to §3.2 Explore
- **For creators** subsection: explicit platform fee statement, large and unambiguous: "Stoa
  takes 10% of what you earn. You keep 90%." — followed by a simple worked example table
  (Subscriber pays $12 → Stoa keeps $1.20 → creator receives $10.80), since a worked example does
  more trust-building than a percentage alone
- CTA blocks at the end of each subsection, matching homepage CTAs

---

### 3.6 Trust & Methodology — `/trust` (not built; scoring half retired)

The original spec's page explained the Track Score formula and the lock mechanism. Both are
retired, and there is no `/trust` route. If a trust page is built, its subject is what a reader
can actually rely on: the fact-check taxonomy (fact / unproven / opinion / contradicted), the
stance frozen once published, the disclosure block, the public EDITED marker and its log, and
what "verified" does and does not mean (a real, accountable person, not a credential). No CTA
buttons; its only job is to be readable.

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
  - **"I invest"** — icon (magnifying glass / chart), one line: "Follow analysts whose judgement
    you trust. Every claim fact-checked."
  - **"I create research"** — icon (pen), one line: "Publish research, take a stance, get paid:
    your page, your price."
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
- Body copy, set apart in a quiet callout box (not alarming, just distinct): "Readers pay for
  the judgement of a real, accountable person. We verify identity, not credentials."
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
  (editable), tabular-figure numeral field with a `$`/mo suffix
- If Per-report selected: same pattern, per-report price
- **Fixed, unmissable line directly beneath the pricing fields**, same treatment as the disclosure
  block's permanence: "Stoa takes 10% of what you earn. You keep 90%." with a tiny worked-example
  tooltip
- Primary button: **"Continue"**

**Step 4 — `/onboarding/creator/first-report`:**

- Drops the creator directly into the real Report Editor (§6.2) with a sample ticker pre-loaded
  (e.g., a fictional or clearly-marked "SAMPLE" ticker) and inline coach-mark tooltips
  (dismissible individually, "Got it" buttons) pointing at: the stance ("The ticker and direction
  are fixed once you publish"), the AI fact-check panel ("Check your claims before you
  publish"), the disclosure checklist ("Required before publishing — investors always see
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
so moving sideways moves through the evidence. Everything else sits on the picture: the dateline
(above the frame on desktop), the stance as a small paper card, and at the bottom the headline,
the analyst with Follow, the scrub bar, and the actions with the pager. See §2.11.

There is no browse-as-text surface. The tabs, the layout toggle and the report-card grid that
used to live here went with Discover; scanning the catalogue is Explore's job.

**Feed card component** (original spec; the Feed as built is the full-screen stage above):

```
┌──────────────────────────────────────────────┐
│ [avatar] Creator Name                           │
│ TICKER · LONG  (or a theme tag)                 │
│ Headline text, one line, truncated              │
│ VIDEO · CARDS                                   │
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

Rebuilt in Direction B on 2026-09-27 (`src/components/report/report-view.tsx`, data built in
`src/app/(app)/report/[id]/page.tsx`, fixture at `/dev/report`). There is no call block: a
publication's stance is a ticker and a direction and nothing more.

**Reading column, top to bottom:**

1. Archived banner, when archived (solid-ink Archived chip, Restore for the author).
2. The headline at the display size (headline size above 80 characters), then the standfirst in
   muted Inter at the title size.
3. The byline: circular face, name (verified tick), a meta line `Thesis · 17 Sep · 6 min read ·
   12.8K views`, the EDITED marker on that line when the piece was edited, and Follow on the
   right (coral fill; coral outline when the piece is gated, so Subscribe is the one fill in
   view; hidden for the author).
4. The stance, quiet: `TickerChip` (links to the ticker page) and `StanceChip`, or a
   `ThemeChip` for a piece with no ticker; like, save and share as small ghost buttons on the
   same line.
5. The body at the reading size (`.stoa-prose--read`, Inter 17 to 18px, headings in
   Bricolage). Key figures (consecutive data figures) read as one row of large numbers, three
   across, two on a phone; a quote is the pull quote (display type behind a 4px coral bar);
   section breaks are whitespace. Evidence cards sit inside the body: where the analyst placed
   them in a Tiptap body, otherwise one after each paragraph from the second, leftovers after
   the text (`interleaveCards`). There is no card strip any more.
6. For a gated reader: the open cards, then the locked section (§2.4).
7. The discussion (`DiscussionThread`, page variant): a Bricolage heading with the count,
   replies, likes, delete your own, the ink Author tag.

**Clip column (desktop):** the clip (click to play, never autoplay, nothing fetched before the
press; black letterbox in both themes; an empty scrub track on the poster), then the disclosure
well, the advice well, and the fact-check summary when there are claims.

**Evidence cards and locks.** Cards are read with the reader's own session. A reader who may
read the piece (free, author, buyer, subscriber) gets locked cards open (`listCardsForReport(id,
{ entitled })`); anyone else gets the open cards plus an empty sealed shell per locked card,
read with the service key and carrying only kind and id. Before 2026-09-27 this was inverted:
entitled readers saw seals, and the readers the seal was for saw nothing. A `figure` card's
image must be a stored `http(s)` URL.

**Layout.** The page is a **`<ScrollFrame>`** that fills the room under the nav; each column
scrolls on its own, so the clip and the trust panels stay beside the text for the length of the
read. It is not `position: sticky` (see §6.2). Below `lg` the frame is the scroller and both
columns are `display: contents`, ordered: headline and byline, clip, stance, body or gate, trust
panels, discussion. On a phone the playing clip docks to a corner once scrolled away. The
reading-progress bar follows the nearest scroller.

**States:**

- Gated: the locked section replaces the body; the stance, clip, open cards, disclosure and
  discussion stay full-strength.
- Clip on its way: `ClipPendingPlayer` holds the frame (failed only for the author).
- Edited: the `<EditedMarker>` on the byline's meta line (§2.14).

### 5.4 Creator profile (logged-in investor view) — `/@handle`

Identical to the public version (§3.3) with two additions:

- Subscribe button reflects real state (Subscribed / Follow both present and
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
Each notification: icon by type (new report = pen, debate reply = speech bubble), one-line
description, timestamp, unread
items get a subtle ink left-border accent (never a full-row color fill, which gets
visually loud in a long list). Mark-all-read as a small text link top-right. Clicking any
notification navigates to its source (the report, the profile, the thread) and marks it read.

### 5.8 Subscriptions & Billing — `/settings/billing`

List of active subscriptions: creator avatar/name, price, "Renews [date]," and a **"Cancel"**
text-style destructive button (`--error` on hover) per subscription — canceling one never touches
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
new coverage of watchlist tickers, debate replies — each independently toggleable, plus a
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
- **Quick stats row**: Subscribers (count, + or − this week in small text beneath), Earnings
  this month (Inter tabular figures, `$X,XXX`), Followers. No score and nothing awaiting resolution: nothing
  resolves.
- **Recent activity feed:** new subscriber, new debate reply, fact-check flagged
  an unproven claim on a draft — same visual list-item pattern as the investor Notifications page
  (§5.7) for consistency across the whole product.

### 6.2 Compose ★ — `/studio/compose` (and `?id=` to reopen a draft, `?type=` to start one)

The other highest-scrutiny screen in the product. The full model is `docs/COMPOSE.md`; this
section is the screens.

**Compose is a short mandatory spine and a menu of options, not a wizard.** Instagram's
structure: everyone walks two steps, and what a publication may add on top is a menu nobody
has to walk past. No screen carries explanatory copy: a heading, the work, one button. The only
sentences are refusals naming what is missing and the few rules a creator would otherwise get
wrong.

**The type picker is the first screen.** Three types described by purpose (Video: reach people
who don't know you; Brief: stay present between big pieces; Thesis: prove you are worth paying
for), each saying who sees it. Three cards on a desktop (`≥ md`); on a phone three compact rows
that all fit above the fold, each a link that starts its type in one tap. Under the cards, **my
drafts**: type, headline, `PLAB · SPINE 1 OF 2 · EDITED 2 DAYS AGO`, a hairline progress bar and
Resume; compact rows on a phone with an `ALL` pill to Studio. `<ComposePicker>`
(`src/components/compose/type-picker.tsx`). The Verdict type is retired with grading.

**The spine is two steps on every type:**

| Type | 1 | 2 |
|---|---|---|
| Video | Video (record or upload; the rung with its timeline) and, under the clip, the headline | Tags |
| Brief | The headline, then the take (a textarea, 300 characters) | Tags |
| Thesis | The headline and the dek, then the report (the Tiptap writer, with the toolbox rail) | Tags |

Then the **publish screen**. The tracker (`<StepNav>`) is two numbered marks joined by a
hairline: the current one filled ink, a done one an ink tick (`--ok`), an unreached one dimmed and
not clickable. Off the spine (the publish screen, a feature editor) no mark is current and the
heading says where you are. Each screen has an eyebrow (`STEP 1 OF 2`, `ADD TO THIS THESIS ·
OPTIONAL`, `READY WHEN YOU ARE`) and a display heading (`<StepFrame>`); no line under it, except
on a live publication's read-only clip, where the rule has to be stated.

**The headline** is a growing textarea in the display face, with the dek under it (not on a
brief, whose text is the take). It sits on the content screen: above the take and the report,
where it has focus on arrival and Enter moves into the text; under the clip, with a one-line
eyebrow, so the clip stays the focus. Continue asks for it once the content is in.

**One button per screen, and its label is what pressing it will do.** On the spine it reads
**Continue**; when it cannot advance the reason sits beside it in `--error`, in the creator's terms
(`advanceFor` in `src/lib/compose/steps.ts`), and clears the moment it stops being true. In a
feature editor it reads **Skip** when nothing has been added, **Done** when the feature is
complete, and Done that refuses and names what is missing when it is half done. Partial
information never passes. Back on a feature editor reads **Back to publish**.

**The features menu** (`<FeaturesMenu>`, `src/components/compose/features-menu.tsx`) sits on
the publish screen above Access: one row per feature the type may add (video: Stance, Cards,
Thesis; brief and thesis: Stance, Cards), each its icon, its name and its state at the right:
`NVDA · LONG`, `3 CARDS`, `NOT ADDED` faint, or `HALF DONE` in `--error` with the reason under it.
Nothing describes what a feature is. Opening a row goes into that feature's editor; Done or Skip
returns to the menu. On a live publication the stance and the clip cannot change: their rows
open to be read, and a live piece with no stance cannot gain one.

**The stance screen** (`<StancePanel>` in `src/components/editor/publish-panel.tsx`) is a
ticker field, looked up as it is typed (a name that does not resolve is refused; the macro
instruments in §6.10 count), and a direction: long, short or hold. One stance per publication.
There is no entry price, no target, no horizon and no eligibility cap, because nothing is graded.

**Tags are one tap, then typed.** The primary list (`<TagSearch>`) is open on arrival when
nothing is chosen: `MOST USED` (from published work) then every group as chips, over a mono
field ("TYPE TO NARROW") that takes focus only when the creator opened the list by pressing
Choose primary or Change; typing narrows to one flat row of chips, prefix matches first; arrows
move, Enter picks, Escape closes; "Nothing matches. Tags are a fixed list" when it does not. A
stance fills the primary from its ticker's sector, marked `AUTO`.

**The header** (`<ComposeHeader>`) is the same on the picker and the workspace: `← STUDIO`,
the STOA wordmark, `COMPOSE · THESIS`, and on the right the draft's save state (`DRAFT ·
SAVED JUST NOW`) at `≥ md`; on a phone the status sits beside the forward button instead. On a
live publication the right holds Preview and Save changes. There is no Publish button in the
header: the spine leads to the publish screen.

**A reopened draft starts at the first spine step it has not finished**, derived from what is
stored (`spineProgress` in `src/lib/compose/drafts.ts`), and every step up to it is unlocked. A
video draft always starts at the video step again, because a chosen clip is held in the tab
until publish; the picker's row says "Needs the clip again".

**The toolbox rail** exists only where the screen can take what it holds, and its contents
match the screen (`railFor` in `src/lib/compose/rail.ts`): the writer gets the card tray and the
assistant; the cards screen gets the tray alone (the deck's order is set there, and the one AI
action that serves cards is a button on the canvas); the video screen gets the tray alone, and
only once a clip is loaded, because that is when the timeline can take a drop. Before a clip,
on a live piece's read-only clip, and on the take, the stance, the headline, tags and publish
there is no rail and the canvas takes the full width. The rail never folds to icons: the
fold-to-icons state was a stub for a rail that was always there, and that rail is gone.

**Two components render half of themselves** rather than being split in two, so the sequence
costs no duplicated state: `<VideoRung stage="all">` on the video screen (the picker and the
editor in one, mounted once for every type that may carry a clip and hidden off-screen so the
loaded clip survives), and `<PublishPanel>` for the publish settings, beside `<StancePanel>`
for the stance. The writer (Tiptap) stays mounted and hidden on every other
screen so the charts the publish path screenshots are never lost. With `stage="all"` the rung
shows its chooser (Record with your camera, the upload drop zone) while no clip is loaded and
the editor once one is; the chooser is gated on "not the edit-only stage", never on a
"choose" stage the combined screen does not send (that gate is what lost the two ways in after
the four-types restructure). `frozen` makes the rung read-only for a live publication: no
Record, Replace, Remove, trim, toolbar or inspector, and a line saying the clip is the record.

**A frame, a header, two scrolling columns:**

| Region | Size | Holds |
|---|---|---|
| Frame | exactly the room its scroller gives it, measured | Everything below |
| Header (full width, in the flow) | auto | The bar, then the step tracker |
| Toolbox rail (left, scrolls) | `248px`, present only where the screen can take a drop or an AI reply, never folded | Card tray, and on the writer the AI assistant |
| Canvas (centre, scrolls) | `--w-standard` (1200px), fluid; the write step keeps a `60rem` measure | The current step |

Compose is a working surface, not an article. The canvas used to be a reading measure with a
column of dead paper either side at any laptop width; a timeline, a deck and a publish panel all
want the room. Only prose wants a measure, so the write step alone caps its column, with its
heading, its words and its buttons all on the same one.

**Nothing on Compose is sticky, and nothing is pinned to another element's height.** The compose
root is a frame exactly as tall as the room its scroll parent gives it (the same `<ScrollFrame>`
that now carries Today, the report page and the branding studio), measured
(`src/lib/layout/frame.ts`: the scroller's inner height, less whatever sits above the frame and the
scroller's bottom padding, plus the negative margins the shell's breakout already reclaims) and re-measured on resize. The header sits in the
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

- `≥ lg` (1024px): both columns on the screens that have a rail; one column everywhere else.
- `< lg`: the toolbox becomes a drawer over the canvas, opened from a Toolbox button in the top
  bar that also carries the deck count, on the same screens. The step rail scrolls horizontally
  rather than wrapping, so the sequence stays one line and the page never scrolls sideways.

Everything in a step is **rendered once**, never rendered twice and hidden with CSS: two copies
would break the radio groups and the `label`/`for` targets inside them.

**A failure in one step stays in that step.** Each step's content sits inside a
`<StepErrorBoundary>` (`src/components/compose/step-boundary.tsx`), and the card editor has one
inside its dialog. A rendering error shows an error-bordered panel in place of that step only,
naming the step, saying in plain words that nothing else was touched, printing the error line in
mono, and offering **Redraw this step**. The workspace's state lives above the steps, so the
header, the tracker, the toolbox and every other step keep their contents. Redrawing the write
step reseeds the editor with the latest words (`editorSeed`), and the video step comes back with
the same clip because the chosen clip's object URL is held by the workspace (`clipUrl`) and
handed to the rung as `initialSrc`. Before this, any such error reached the route's error page,
whose Try again remounted the whole sequence at step one. A dev-only `<DevCrash>` inside each
boundary throws when `window.__stoaCrashStep` names the step; `/dev/compose-refresh` has buttons
for it and for replaying a save's router refresh.

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
- **Prove it** — Checklist
- **Compare** — Your edge
- **Show the risk** — Kill switch, Catalysts
- **Your own** — Figure, Chart

A **Custom** entry lists the same seven formats by shape (Statement, Checklist, Two columns,
Conditions, Timeline, Image, Chart) for the creator who already knows they want a
timeline and does not want to be asked why. Both routes build the same card.

The **Steelman** (Objection and answer) is parked: not offered here until the analysis that
supplies the objection works. Its kind, schema, editor and Feed rendering remain, so a
publication that already carries one renders unchanged and a draft holding one can still open it
(`PARKED_KINDS` in `src/lib/compose/cards.ts`).

**Path to target** (Steps) is retired, not parked (decided by Bar, 2026-09-28): it ended in a
price target, and targets went with grading. It is never offered new, by intent or by shape. Work
already published keeps it exactly as the analyst wrote it, in the Feed, on the report page and in
Compose, where it still opens and edits (`RETIRED_KINDS` in `src/lib/compose/cards.ts`).

**Editing a card ends with Done.** The editor is a dialog; its footer carries a quiet Delete on
the left and, on the right, one line saying what happens ("Saved with the draft. Reopen it from
the toolbox or the Cards step any time"; on a live publication, "Press Save changes above to
record the edit") beside a solid-ink **Done**. Every keystroke has already landed on the card, so
Done closes and, on a draft, runs the same save the header button runs. Done means finished for
now, never locked.

#### Dragging a card into both

This is the point of the workspace. A card dragged out of the tray can be dropped:

- onto the video timeline's **VISUAL track**, becoming a timed overlay starting where it was
  dropped;
- into the **research body**, becoming an inline figure at that position.

Drop targets highlight while a card is over them (an ink ring and tint). The drag uses a private
MIME type, `application/x-stoa-card`, not `text/plain`, so a target can tell a card from a text
selection *during* dragover, when `dataTransfer` values are unreadable and only the type list is.

A drag needs a mouse. Every tray row therefore also carries a **Place menu** ("Place in video",
"Insert in research") that does the same thing from a keyboard or a phone. Neither gesture is the
fallback for the other; the menu is the only one that works at 390.

Both placements store **only the card's id** (a `cardNode` in the body, a `{ type: "card",
cardId }` visual source on the track). Editing the card once updates it everywhere it appears.
Deleting a card removes its placements with it, rather than leaving a hole on the track and a
placeholder in the prose.

**A card's id is its row key, minted on the client and kept for life.** `newCardId` makes a
UUID; `toStoredCards` sends it with the card; `replaceCards` (`src/lib/db/publication-cards.ts`)
updates a row the publication already holds under that id, inserts a card that has none, and
deletes only the rows no longer in the deck. Positions are parked out of range on the first
write and placed on the second, so two cards swapping places never collide on the
`(report_id, position)` constraint. An id the client sends that is not one of the publication's
own rows is ignored and the card inserted fresh. The save used to delete every row and let the
database mint new keys, which left every placement pointing at a dead id the next time the draft
opened; the compose page's mapping of row id onto client id (which fixed the open side) only
ever worked until the next save. The pinned CTA card's constant id and fixture ids are not UUIDs
and are never sent, so those rows are minted fresh on each save, which is harmless because
nothing is placed by them.

#### The video editor

Built the way the editors analysts already use are built. CapCut, Instagram's Reels editor,
TikTok's editor and Descript are all made for people who do not think of themselves as editors, and
they agree on a shape. This is that shape, in `src/components/compose/video-rung.tsx`:

- **One picture above one timeline.** The stage (16:9, capped at under half the viewport so the
  timeline never drops below the fold) and under it a strip of frames grabbed off the clip. No
  second track, no zoom, no frame-step buttons.
- **Trim by dragging the ends of the clip.** Thick ink brackets at each end of the kept region,
  dragged inward; what is cut is dimmed; the kept range is printed on the strip while trimmed.
- **Things are placed by dragging them on the picture.** Insets and text snap to the nine
  `GridPosition`s the burn-in understands; the 3×3 grid shows only while something is being moved.
  Text is typed on the picture itself (a `contentEditable` that owns its text while focused).
- **Things are timed by dragging the ends of their bar** under the strip. Text bars are outlined in ink,
  visual bars sit on the grey well. A lane appears only once there is something in it, and a second lane only when
  two things overlap in time. A short bar keeps a grabbable middle; its end zones shrink with it.
- **Settings appear only while something is selected.** Selecting a bar or a thing on the picture
  swaps the add row for that thing's controls (text and size; or over-the-picture / full-frame,
  a Size slider for an inset, an Opacity slider, the card, chart or Napkin fields; from/to;
  Remove; Done). Nothing selected: the add row.
- **An inset is resized on the picture.** The selected inset carries one ink corner handle, on
  the corner farthest from the grid anchor the box is pinned to, so dragging it outward grows the
  box away from its spot (a centre-column box grows both ways). Width is stored as a fraction of
  the picture (`size`, 0.20 to 0.84, default 0.46) and the height follows so the box keeps the
  shape it has always had. The Size slider does the same from a keyboard or a phone.
- **Opacity** (`opacity`, 0.2 to 1) applies to the visual in both modes; in full frame the video
  shows through the card.
- **Full frame fills the picture, with the video behind it.** The picture stays and is dimmed
  (ink at 62%); the visual sits inside a 4% margin, scaled with the stage (`zoom`, 1 to 2, off a
  520px reference) so a card that reads at 13px in the toolbox reads like a slide, with a soft
  shadow. While a full-frame visual shows, insets and text on the same seconds are not painted:
  they wait until it is gone. It used to replace the picture with a sheet of paper and let the
  other overlays paint over the top, which was the collision the mode existed to avoid.
- **At rest:** play, the time, the strip, and five things you can add at the playhead: Text, Card
  (a menu of the deck), Chart, Visualize, Image. A card can also be dragged from the toolbox onto
  the strip, or placed from the tray's Place menu.
- **The cover** is a folded row under the timeline (the chosen frame, or "Choose"); opening it shows
  the same frames as the strip plus an image upload. Shown at 4:5 as on Explore and the profile.
- **The faithful preview** ("Preview as it will publish") hides every handle, ring and label and
  plays exactly what will ship. It draws the overlays through the same `OverlayLayer` the
  player uses, so it cannot drift from the published video. (The Feed moves a caption placed in
  the top or bottom row just inside its own chrome, so it is never drawn under the headline or
  the stance; the preview has no chrome and draws it at the placed row.)
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

#### The publish screen, top to bottom

1. **Preview**, then the fact-check offer when there is a writer with words in it.
2. **The features menu** (above), then the connected piece.
3. **Access** — free / subscribers / paid unlock with its price.
4. **Promote** — a "Boost on publish" switch. **The cost model is pluggable and deliberately
   unset.** Pricing arrives as a `PromoteModel` (`src/lib/compose/promote.ts`) and the panel
   renders whatever it is handed, including nothing; while there is none it says so plainly and
   offers nothing selectable, so nothing can be sold at a price nobody has agreed. The old fixed
   Boost packages are **not** wired in. The one rule that does not depend on pricing is always
   stated: **promoted content is always labelled as promoted, wherever it appears.** Promotion
   belongs to the publication rather than to composing it, so the same panel is reachable after
   publish from the item in Studio.
5. **Disclosures**, as a gate.
6. **Publish** — one press, labelled **Publish**. No confirmation modal and no ceremony.

**Pre-publish fact-check panel:** a "Run fact-check" button; while running, a calm inline loading
state; once complete, the claim-by-claim breakdown with an inline "Add source" input on each
`unproven` claim, or "Mark as opinion" when it is genuinely a judgment call.

**Disclosure checklist**, required, each a real toggle (never a single "I agree" checkbox that
hides real information): position held, compensation tied, views certified. Publish is disabled
until every disclosure is *answered* (the fact-check is a bonus, never a gate) (a Yes with
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

- Overlays are stored with the publication (`reports.video_edit`) and drawn by Stoa's player at
  playback, from the same renderer as the faithful preview (`src/components/video/overlay-layer.tsx`).
  They are not composited into the file: a clip shared or downloaded elsewhere plays without them,
  and the editor says so. The processing state after publish stays.
- A locked card placed as an overlay is drawn sealed wherever a reader plays the clip, and its
  payload never leaves the server: `sealStoredEdit` empties it before the Feed or the report page
  sends the edit. Only Compose, for the card's author, reads the edit unsealed.
- Per-card free/locked control stays. The **CTA card is pinned last** and is **derived from
  Access**, not authored, so it cannot be deleted, duplicated, or left behind on a publication
  that stopped being gated.
- Tags stay: one primary that drives discovery placement, up to two secondary, from the closed
  curated list.
- Existing drafts open in the workspace without losing anything: body, tags, access, the stance,
  and the saved deck with locked payloads intact.

**AI assist (left rail, under the tray):** generate cards from the thesis, insert a metric, build
a chart, structure my thesis, tighten this, suggest a headline, and **Devil's Advocate with its
credit cost shown**. Each entry **seeds** the Ask panel rather than firing on click: a paid tool
shows its price and then lets the analyst decide, and suggestions are inserted as something the
creator accepts, never silently auto-written, preserving the certification promise that the
published words are genuinely their own.

### 6.3 My Reports — Studio's Publications list (`/studio`)

As built, one list of the analyst's publications with drafts, published and archived pieces
(spec'd as `/dashboard/reports`). There are no Open / Resolved tabs: nothing is open and nothing
resolves.

**Archived rows** carry a solid-ink ARCHIVED chip beside the content badge, dim the headline so
they read differently while scanning, and spell the state out on the status line: hidden from
the public, and restorable. The content badge lists what the publication contains and is
dropped entirely when it would only repeat the type label.

- Drafts: title, last-edited timestamp, row actions: Edit, Delete (a one-line confirmation).
- Published: title, type, ticker and direction when it has a stance. Archive always; Delete only
  where §2.15 allows it.
- Empty state names what is missing and offers Compose.

### 6.4 Track Score Analytics — `/dashboard/analytics` (retired 2026-09-24)

Deleted with grading: no score, no hit rate, no per-call performance table, no percentile rank
and no methodology link. What an analyst sees about their own work is Studio's Insights (reach
and audience, `/studio/insights`), which never scores them.

### 6.5 Audience — `/dashboard/audience`

- Subscriber count + growth chart (simple line chart)
- Churn rate, shown plainly as a percentage with a short explanatory tooltip, not dressed up
- Subscriber list (paginated table: name/handle, subscribed-since date, tier if multiple exist)
- **Top referral sources** — where subscribers are coming from (a simple bar list: Direct,
  Explore/Feed, Shared report links, Search)
- **Referral program section** (full vision, not deferred): a creator-specific referral link they
  can share, with a small dashboard of signups attributed to it — kept genuinely simple, one
  link, one stat block, no complex multi-tier referral mechanics

### 6.6 Earnings & Payouts — `/dashboard/earnings`

- **This month's earnings**, large number in Inter tabular figures, with the **platform fee always shown as its
  own explicit line** directly beneath it every single time this number appears anywhere in the
  product: "Gross: $X,XXX · Platform fee (10%): −$XXX · Net: $X,XXX" — repeating this breakdown
  on every earnings view (not just once at signup) is a deliberate trust-building habit, not
  redundancy.
- Revenue breakdown by source: Subscriptions vs. Report purchases (simple stacked bar or two-line
  comparison)
- Payout method (links out to the PayPal-hosted account dashboard via the backend's
  dashboard-link endpoint — this page doesn't rebuild PayPal's own payout UI, it hands off to it)
- Payout history table: date, amount, status

### 6.7 Storefront editor — `/studio/branding` (trimmed 2026-09-27)

It offers only what the public storefront (§3.3) shows. Filling in something that never
appears is worse than not being asked, so everything else was removed with the storefront
rebuild.

**Layout.** Under the page heading, a `<ScrollFrame>`: the form scrolls in its column and the
live preview (`ProfilePreview`: the real `StorefrontHero` in compact form, and the card a shared
link produces) stays beside it; below `xl` the frame is the scroller and they stack. The tab row
is `shrink-0`: without it the frame's flex column squashed it to zero height, and before
2026-09-27 the Style and Pricing tabs could not be reached on a desktop. `/dev/branding` mounts
the editor inside the private-shell fixture.

**Three tabs.**

- **Profile.** The identity (face, name, handle, headline, bio) shown read-only, with a link to
  Settings where it is edited. The pinned publication (or "Your latest publication"), saved on
  click, the same setting Publications' "Pin to profile" writes. The audience line's member
  count switch, saved on click. The share image (`profiles.cover_url`): the picture a shared
  link carries, cropped at 1.91:1; the storefront itself draws no banner.
- **Style.** The headline face (Grotesque or Modern, `profile_config.font_pairing`) and the
  faint paper texture (`profile_config.texture`). No colour: coral, green and red mean the same
  thing on every page, and the ink accent had nothing left to tint on the storefront.
- **Pricing & tiers.** `PlanManager`, and the single-price fields being retired.

**Removed on 2026-09-27:** specialties, featured tickers, social links, section order and the
addable sections, colour themes, the accent colour, the report layout presets, and the AI brand
analyzer (its suggestions were mostly for specialties and social links, and its Apply did
nothing for the headline and bio, which Settings owns). Onboarding's banner style choice went
with them. The keys stay in `ProfileConfig`, marked retired, because some rows still carry them.

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
creator-specific notification types added: new subscriber, new debate reply.

---

### 6.10 Macro instruments — `/markets/[symbol]`

Gold, crude, Treasury yields and bitcoin are tracked instruments with their own pages, their own
search hits, and validity as a stance ticker. They render through `<MacroView>`, which
carries the same Lightweight Charts tape and the same Stoa activity blocks as a stock, and drops the
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
would shadow a company page and leave a stance ambiguous about what it was taken on. Search
carries keyword aliases, so "gold", "oil", "treasuries" and "bitcoin" all reach the right
instrument while an exact equity symbol match still outranks them.

**Bitcoin is a deliberate single exception**, included because it now trades as a macro asset.
Stoa does not cover crypto generally and this table is not the place to start.

**A yield is not a price.** The three Treasury pages carry a note saying that a view that the
level will rise is a view that bond prices will fall. Any instrument where "up" does not mean
"worth more" needs that line, or a long stance invites the opposite of what the analyst means.

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
  /shared                -- TopNav, DisclosureBlock, ReportGate, FactCheckLayer, DebateThread,
                             EditedMarker  (Part 2, one file each)
  /feed                  -- FeedCard, CreatorCard
/lib
  /design-tokens.css     -- every value from §1.4, as CSS custom properties
  /tailwind.config.ts    -- maps the token file into Tailwind's theme, don't hardcode hex in components
```

**On this build:** routes are NOT renamed to the `/@[handle]` pattern above — see the adaptation
note at the top of this document. Read the structure above as "what the ideal IA looks like,"
and map it onto the existing `/analyst/[handle]`, `/feed`, `/studio` routes in practice.

### 7.2 Token file, concretely

Every value exists as a real CSS variable in `src/app/globals.css`, never a scattered literal
(the few places CSS cannot reach are listed in `docs/DESIGN_LANGUAGE.md` §8). The light values:

```css
:root {
  --paper: #fafafa;  --surface: #ffffff;  --surface-2: #f2f3f5;
  --ink: #101418;    --text-mute: #5b6470; --text-faint: #8a919b;
  --border: #e6e8eb; --border-strong: #c9ced4;
  --coral: #ff5a47;  --coral-text: #c8321f; --on-coral: #101418;
  --gain: #12b981;   --gain-text: #087a55;  --loss: #e5484d; --loss-text: #c92a31;
  --font-display: var(--font-bricolage), var(--font-heebo), ...;
  --font-sans: var(--font-inter), var(--font-heebo), ...;
  --font-mono: var(--font-jetbrains), ...;   /* tickers only */
  --type-display: clamp(2.5rem, 1.7rem + 3.6vw, 4.5rem);
  --type-headline: clamp(1.5rem, 1.25rem + 1.1vw, 2rem);
  --type-title: 1.1875rem; --type-body: 0.9375rem; --type-ticker: 0.8125rem;
  --r-button: 999px; --r-chip: 999px; --r-field: 10px;
  --r-panel: 14px;   --r-inner: 8px;  --r-avatar: 50%;
}
```

### 7.3 Icon set

Use **Lucide** icons for new components going forward (see `AGENTS.md`'s tech stack note) — the
line-icon style matches the restrained, non-illustrative direction this spec calls for. Existing
Phosphor usage across the current codebase is not an urgent rip-out, but don't add more of it;
the goal is Lucide in steady-state, not both libraries indefinitely. Do not add custom SVG
illustrations. (The seal, once the one custom asset, is retired with grading.)

### 7.4 Accessible primitives

For modals (the archive and delete dialogs), popovers (`<FactCheckLayer>` claim popovers), and dropdown
menus (role switcher, notification bell, account menu, overflow `[···]` menus), build on top of
**Radix UI primitives** rather than hand-rolling focus-trap and ARIA behavior from scratch — this
is the fastest path to genuinely meeting the §1.6 accessibility floor rather than approximating
it.

### 7.5 What's deliberately NOT specified here

Two things are real product surfaces but out of scope for this design pass, flagged so nothing
falls through a gap silently:

- **Email templates** (welcome email, digest emails) — these need their
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
