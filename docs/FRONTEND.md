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
> The tokens and shared primitives changed first; **surfaces are rebuilt one at a time. Today was
> first (2026-09-27, §3.1b).** Until a surface is rebuilt it keeps its old layout in the new colours and type.
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

**Shadow:** one elevation value, `--shadow-card`, used sparingly. Trust-critical cards (the
disclosure block) keep the doubled hairline of `.ledger-card`, reserved for information that must
never be mistaken for ordinary content.

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
  `--tab-h + --main-pad-y`, and a frame that is its own scroller (the report page, the branding
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
- **Shrink on scroll.** Scrolling down scales the pill to `0.92` about its bottom edge; scrolling
  up restores it, over `--dur-2` on `--ease-out`. Under `prefers-reduced-motion` it stays at full
  size. This is a deliberate exception to the "do not animate nav" rule in `docs/MOTION.md` §A.4,
  asked for by name; the travelling lens above is the only other thing in the nav that moves.
  It listens to `main`; a surface that scrolls in its own column (the Feed, Today's frame)
  does not shrink it.
- **Never flickers.** The direction decision is `src/lib/nav/scroll-shrink.ts`, a pure function
  with tests. Movement accumulates in one direction and only flips the bar past an 18px
  threshold, so a resting thumb cannot flutter it; a reversal restarts the count rather than
  netting off, and the top 24px always restores full size.
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

Rendered as a ledger-card (double-ruled border, `--paper` background at 100% opacity even when
the rest of the page has a paywall scrim over it — see §2.4). Each row is a fixed-format chip,
not free text, specifically so a creator cannot write persuasive copy into their own disclosure.
If `compensation_tied = true`, the second row expands one line to show `compensation_detail`
verbatim, in `--text-sm`, no styling flourishes.

This is the one component in the entire product explicitly *not* covered by a creator's branding
controls (§ Page Branding, Part 3). State that constraint directly in the component's own code
comments for Claude Code's benefit: **never accept a theme/color prop on this component.**

### 2.4 `<PaywallGate>`

Wraps the report body content only — never the ticker strip, the stance chips or the disclosure
block, which render above/outside this component entirely.

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
- **On a phone:** dateline, headline, and actions sit on the picture (lower third), so the face
  is not squeezed by a second column of chrome. Desktop still uses the paper strip beneath the frame.
- **Above the frame (desktop):** the mono dateline, `VIDEO · NVDA · AUG 22, 2026 · 0:58`, with the position
  in the feed at the right end. A publication with no ticker has its theme tag in that slot.
- **On the picture:** ticker and direction chips top-left, the mute control top-right, a progress bar along the top edge that is also
  the scrubber (`<ScrubBar>`: a hairline at rest, thicker while held, drag to any point), and the
  analyst's lower-third identity band across the bottom (avatar, name, handle, Follow).
- **Beneath the frame (desktop):** the headline, then the editorial action bar (LIKE · DISCUSS · SAVE ·
  SHARE as small outlined icons with sentence-case labels), then the pager (`1 / 7`)
  at the right end. The pager is a button: it jumps to the unlock card.
- **The chips are the publication's stance.** Its ticker (`reports.ticker`) and, beside it, its
  direction (`reports.stance`) when it declares one. A publication with a
  ticker and no stance shows the ticker alone. One with no ticker anchors on a theme or sector tag
  instead. An empty chip is never drawn. `stanceChips()` in `src/lib/db/publication-row.ts`.
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
- **Stoa's own chrome, the same as the Feed's.** A tap on the picture pauses
  and resumes, the mute sits top-right, and the scrub bar runs along the
  bottom edge (`<ScrubBar>`, shared with the Feed, the Explore and Dispatch
  cards and the landing lead). The browser's control bar used to sit here; it
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

   This holds on every surface: Today's lead and bands, the profile's lead tier
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
`?lead=processing`, `?faces=quiet`).

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
   of their newest piece). A coral ring (`.today-ring`) marks anyone who has posted since this
   browser last looked at Today (`localStorage` `stoa:today:last-looked`, read once per page load
   and then replaced; a first visit rings nobody). On a quiet day with no posts in 24 hours the row
   shows the most recent posters under **Recently posted** instead of claiming today. The phone's
   one sideways scroller; on a desktop the faces wrap.
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

### 3.3 Public creator profile — `/@handle`

**Layout, top to bottom:**

**Header band** (full-width, ~200px tall):

- Creator's banner image/color (their branding control, per Part 4's Page Branding spec) fills
  the background
- Avatar (`--radius-md`, 96px) overlaps the bottom edge of the banner by half its height (a
  deliberate anchor point — same treatment on every profile so it reads as a system, not a
  per-creator layout choice)
- Beside the avatar: display name (Bricolage, headline size,
  since this is UI chrome identifying a person, not editorial content), handle in `--text-sm`
  muted, a small verified-identity check icon with tooltip "Identity verified — not a credential
  claim"

**Audience line** — `4.3K FOLLOWERS · 214 MEMBERS` (members only if the analyst opts in). This
is the only number shown about an analyst. There is no score, rank or track record.

**Bio** — one line, Inter body size, creator-written, max ~140 characters enforced at
input time (Part 4, Page Branding)

**Pricing card** (ledger-card styling):

- Subscription price if enabled: "$[X]/mo" large, Inter tabular figures, **"Subscribe"** coral button
- Per-report price if enabled, shown as a secondary line: "or $[X] per report"
- If a viewer is already subscribed: card swaps to "You're subscribed" state with a small
  "Manage" link instead of a Subscribe button

**Report archive** — reverse chronological list, full width:

- Each row: the type label, ticker and direction chips when the publication declares a stance
  (a theme tag when it has no ticker), headline, content badge, small fact-check summary
  (`9 fact · 2 unproven`)
- Pagination: simple "Load more" button at the bottom (not infinite scroll)
- **Empty state (brand-new creator, zero published reports):** replaces the list with: "No
  reports published yet." — and if the viewer is logged in and not this creator, a **"Follow"**
  button so they can come back when there's something to read

---

### 3.4 Report public preview — `/@handle/[report-slug]`

**Layout:** identical page shell to the full Report Detail Page (§4.3) for everything above the
fold — ticker strip, creator strip (avatar, name, Follow), the stance chips (fully visible, never
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
so moving sideways moves through the evidence. Above the frame, the mono dateline; on the picture,
ticker and direction chips and the analyst's lower-third identity band;
beneath it, the editorial action bar and the pager. See §2.11.

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

**Full layout, desktop (two columns inside a frame; each column scrolls on its own):**

```
┌─────────────────────────────────────────────────────────────┐
│  <TopNav>                                                     │
├─────────────────────────────────────┬─────────────────────────┤
│  TICKER · Company Name · $XX.XX ↑0.4% │  [clip]                 │
│  THESIS · NVDA · LONG  [EDITED]        │                         │
│  Report Headline                       │  [avatar] Creator Name  │
│                                        │  [Subscribe/Following]  │
│  ── report body                        │                         │
│     with <FactCheckLayer> annotations  │  ┌─ DISCLOSURE BLOCK ─┐ │
│     inline throughout ──               │  │ Position: ...      │ │
│                                        │  │ Compensation: ...   │ │
│  [PaywallGate scrim if not entitled]  │  │ Views: certified    │ │
│                                        │  └─────────────────────┘ │
│                                        │  [fact-check summary]   │
│  Share · Report an issue               │  9 fact · 2 unproven    │
└─────────────────────────────────────┴─────────────────────────┘
```

- The stance is the ticker and direction chips beside the type label under the masthead; there
  is no call block, no target, no horizon and no status. The right column holds the clip, the
  analyst, disclosure and the fact-check summary. The page is a **`<ScrollFrame>`**
  (`src/components/layout/scroll-frame.tsx`) that fills the room under the nav; the writing
  scrolls in its column and the right column stays in view for the length of the read, so the
  trust surface never scrolls away from the claims it vouches for. It is **not** `position:
  sticky`: it used to be, pinned `top-20` inside the app's scrolling column, and since the nav is
  not inside that column the rail sat a band lower than the masthead. See §6.2 for why nothing in
  the app is pinned to a nav height any more.
- **Mobile:** below `lg` the frame itself is the scroller and both columns are `display:
  contents`, so the blocks order themselves: masthead, clip, writing, trust panels, comments. Same
  content, same order, nothing sticky.
- The reading-progress bar follows the nearest scroller (`animation-timeline: scroll(nearest)`),
  which is the writing column. It used to follow the document, which never scrolls inside the app
  shell, so it never moved.
- Report body typography: Inter at the body size with a long line height (`.t-body-editorial`, `.stoa-prose--read`). The principle stays: this is the one place
  where long-form reading is the point, so the body gets a reading face and measure.
- **`<FactCheckLayer>`** wraps the entire body as described in §2.6 — underlined claims, hover/tap
  popovers, debate icons on opinion claims.
- **Bottom bar:** Share button (native share sheet / copy-link), "Report an issue" (opens a
  lightweight form — flags to moderation, not a public comment)

**States:**

- Not yet entitled: `<PaywallGate>` active on the body only, everything else full-strength per
  §2.4
- Loading: skeleton for the report body only; ticker strip, stance chips and disclosure block
  render from cached/fast metadata queries and should appear near-instantly even if the body is
  still loading
- Edited: the `<EditedMarker>` beside the byline (§2.14)

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
- **Prove it** — Path to target, Checklist
- **Compare** — Your edge
- **Show the risk** — Kill switch, Catalysts
- **Your own** — Figure, Chart

A **Custom** entry lists the same eight formats by shape (Statement, Steps, Checklist, Two
columns, Conditions, Timeline, Image, Chart) for the creator who already knows they want a
timeline and does not want to be asked why. Both routes build the same card.

The **Steelman** (Objection and answer) is parked: not offered here until the analysis that
supplies the objection works. Its kind, schema, editor and Feed rendering remain, so a
publication that already carries one renders unchanged and a draft holding one can still open it
(`PARKED_KINDS` in `src/lib/compose/cards.ts`).

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
  player uses, so it cannot drift from the published video.
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

### 6.7 Page Branding — `/dashboard/branding`

**Layout.** Under the page heading, the studio is a `<ScrollFrame>`: the form scrolls in its column
and the live preview stays beside it; below `xl` the frame is the scroller and they stack. The
preview used to be a sticky column pinned `top-20` inside the app's scrolling column, where the nav
is not. `/dev/branding` mounts the studio inside the private-shell fixture for review without a
session.

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
  /shared                -- TopNav, DisclosureBlock, PaywallGate, FactCheckLayer, DebateThread,
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
