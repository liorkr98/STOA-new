# Stoa — Build Spec

**Purpose.** This is the complete remaining frontend implementation for Stoa, written so it can be
worked through end to end. Every design decision here is settled — do not redesign, reinterpret, or
improve on it. Where something is genuinely undecided it is marked **DECISION REQUIRED**, and those
are the only points that should interrupt the run.

**Read first:** `docs/FRONTEND.md` (design tokens, the source of truth) and `docs/PRODUCT_MODEL.md`
(the product model). Everything visual defers to FRONTEND.md.

---

## 0. Governing rules

### The product model
The atomic unit of a Stoa publication is the analyst's **video**. Everything else is optional
enrichment: a locked **call** (ticker, direction, target price, horizon), **cards** (a swipeable
stack of evidence), and a full written **thesis**. A publication may be video-only commentary with
no call at all.

- Type labels: **CALL** / **RESEARCH** / **NOTE**.
- Every item carries a **content badge** stating exactly what it contains: `VIDEO`,
  `VIDEO · CALL`, `VIDEO · CALL · 8 CARDS`, `VIDEO · CALL · CARDS · THESIS`.
- **Anchoring rule.** Items *with* a call show a ticker chip and a direction chip, and a HIT / MISS /
  NEAR seal once resolved. Items *without* a call show **no ticker, no direction chip, no seal** —
  they anchor on a theme or sector tag instead (e.g. `MACRO · OIL & ENERGY`, `SEMIS`).
- Only items with a locked call are ever scored. Commentary is never graded.

### No public scoring — already implemented, do not reintroduce
No score, rating, rank, percentile, or leaderboard appears anywhere public. Analysts appear as an
avatar and a name only. The single exception is the **public analyst profile**, which shows
`4.3K FOLLOWERS · 214 MEMBERS` — the member count being optional and analyst-controlled.

**Never aggregate analysts into a verdict.** No long/short splits, no average targets, no consensus
figures. Show who is talking and what each of them said individually. Coverage volume (publication
and analyst counts) is fine; blended opinion is not.

**Resolved outcomes stay visible everywhere** — HIT / MISS / NEAR seals, entry → exit, return,
alpha per call. Those are evidence, not a grade.

### The lifecycle model — this replaced score-based ranking
Content and creators move through five stages: **NEW** (time on platform plus publications
published), **AVERAGE** (the steady middle), **RISING** (gaining momentum), **TRENDING** (gaining
fast — velocity, not accumulated volume), **POPULAR** (established, high accumulated attention).

Only **NEW** and **TRENDING** are ever displayed to users. Average, rising and popular are invisible
mechanics that drive placement. Nobody sees "AVERAGE" or "POPULAR" on themselves.

Where the thresholds between stages are not yet defined, implement the mechanism with clearly
marked, easily-changed constants and report what you chose.

### Day change
The multi-symbol quote path returns only the current price; the previous close is dropped, so day
change cannot be computed for lists. The single-symbol snapshot *does* carry `changePercent`, so
instrument page headers can show a real one.

Everywhere else a day change belongs, render a **neutral placeholder that reserves the same width
and position** the real value will occupy — a quiet grey dash, never coloured, never a gap. Mark
each with a greppable comment so they can be filled in later. The page must not reflow when the
data arrives.

### Data honesty — absolute
Use only data that exists. Where something is missing, either render a clearly-marked placeholder
or hide the element. **Never invent content that would look real to a user on a live financial
site** — no fabricated prices, no invented movers, no fake view counts, no synthetic notifications.
If a whole band cannot render honestly, hide it and say so in the report.

---

## 1. Pause rules — when to stop and ask

Stop and ask only for these. Everything else: decide, implement, and report what you chose.

1. **Any schema change.** Adding a column, table, or index. Report what is needed instead.
2. **Anything touching money or pricing.** Prices, tiers, payouts, take rate, credits. Especially
   the two parallel pricing systems (the `plans` table vs the legacy flat `sub_price` /
   `report_price`) — do not migrate or consolidate them.
3. **Anything that deletes or overwrites existing data.**
4. **Where this spec contradicts what is in the code.** Do not guess which is right.
5. **Anything explicitly marked DECISION REQUIRED below.**

---

## 2. Verification — after every surface, before moving on

1. Typecheck, lint, and build clean.
2. **Load every page you touched in a real browser and confirm it renders.** A clean build does not
   prove a page works — a client/server boundary mistake once produced an HTTP 200 with an empty
   page. Check the console for errors.
3. Confirm imports resolve and no component is rendered that no longer exists.
4. Check the surface at desktop (1440) *and* mobile (390) widths.
5. Commit that surface as its own commit with a plain-language message.
6. Only then continue to the next surface. If a surface cannot be made to render, stop and report.

`.env.local` holds placeholder Supabase credentials, so database-backed pages render empty locally.
Use the repo's existing `/dev/*` fixture routes to verify populated states, and delete any temporary
harness you create.

---

## 3. Surface: Profile — content restructure

The scoring removal is already done. This is the content area.

**Remove the tab strip entirely.** Content is no longer sorted by format. It becomes one body of
work in three tiers of decreasing size.

**Tier 1 — the lead video**, full width of the content column. The analyst's most recent video by
default, or one they have pinned (the pinned mechanism already exists in `profile_config`). A large
player with play glyph and duration, then beneath it the metadata row (type label · ticker chip or
theme tag · content badge), the serif headline, and a one-line deck. If it is a resolved call, the
seal appears here too. A small mono label above reads `LATEST` or `PINNED`.

**Tier 2 — most watched**, a row of three or four popular videos: thumbnail with duration, serif
headline beneath, mono meta line. Mono section header `MOST WATCHED`. Tier 1 covers recency; this
covers their best work.

**Tier 3 — everything**, a grid mixing videos and written reports as peers. Videos are thumbnail
tiles. **Written reports with no video are typographic tiles** — the serif headline set on paper
with a hairline border, no image, so it reads immediately as something to read rather than watch.
Each tile carries its metadata row; resolved calls carry their seal. Mono section header
`EVERYTHING`.

**Subject filter**, above tier 3: a single quiet mono control `SUBJECT: ALL ▾` listing the tickers
and themes this analyst actually covers, with counts. Selecting one filters the grid. This replaces
what the tabs were doing and works for a specialist or a generalist equally.

**The new-analyst state.** Someone with one or two publications and no resolved calls should feel
**sparse, deliberately**. No placeholder metrics, no encouraging filler, no "coming soon" panels.
Their lead video, specialty, bio, and whatever exists. Tiers 2 and 3 collapse or disappear when
there is not enough to fill them. The page fills as they publish — that progression is the point.

**Mobile:** lead video full-bleed, tier 2 scrolls horizontally, tier 3 becomes two columns.

---

## 4. Surface: Today — full rebuild

Today is Stoa's daily newspaper. Reference model: a serious digital newspaper front page — a lead
with a category kicker, a stack of secondary headlines, a numbered list of what is rising, topic
clusters, and **sections that scroll horizontally on their own** with their own previous/next
controls. That last pattern is the defining one.

### Layout
A persistent **left sidebar** (~248px) beside the main content column. The sidebar stays in place as
content scrolls.

### The sidebar
Grouped lists in this order. **Each list is independently scrollable** when it holds more items than
fit — a contained scroll area with a subtle scrollbar, *not* a "see all" link.

- `TRENDING CREATORS` — analysts gaining attention fast (velocity). Avatar and name.
- `POPULAR CREATORS` — established, most-followed. Avatar and name.
- `TRENDING TICKERS` — ticker chip, price, day change slot.
- `POPULAR TICKERS` — most-covered names on Stoa.
- `YOUR MEMBERSHIPS` — analysts the reader pays for.
- `FOLLOWING` — analysts the reader follows.
- `YOUR TICKERS` — tickers the reader follows. (There is no membership to a ticker.)

If the reader's own lists are short or empty, fill the remaining space with **suggestions**, clearly
marked as suggestions rather than existing relationships.

### The main column

**Masthead:** a large centred serif `STOA` at newspaper-nameplate scale — dominant, but not so large
that the lead is pushed off the first screen. `TODAY` in widely-spaced mono beneath, a heavy
horizontal rule, then a centred mono issue line: `ISSUE №41 · TUESDAY, AUGUST 18, 2026 · YOUR DAILY
BRIEFING`.

**The lead — a split.** Left: a large video with play glyph and duration, a mono kicker
(`THE LEAD · SEMICONDUCTORS`), a large serif headline, a serif deck, and a mono byline with the
analyst's name, ticker and direction chips, content badge, and time. Right: a stack of three
**secondary headlines**, each with its own kicker, a smaller serif headline, and a byline. Four
stories above the fold, none crowded.

**Then these bands**, each with a serif section header, a mono note beside it, and a hairline rule:

1. **TRENDING NOW** — a numbered list across two columns of four. Numeral large in serif grey, mono
   kicker, serif headline, byline. Measures **velocity**, not accumulated popularity. Horizontally
   scrollable with its own arrows. Headlines a step smaller than the lead's so hierarchy is
   unmistakable. **On mobile only:** collapse to five items with a "See more" control that expands
   in place. Desktop shows the full list.
2. **YOUR DESK** — a horizontal rail of video cards from the reader's memberships and follows,
   merged into one rail rather than split. Each card: thumbnail with duration, a mono line naming
   the analyst and tagging the relationship (`PRIYA NADAR · MEMBER` / `LENA KOWALCZYK · FOLLOWING`),
   and a serif headline. Horizontally scrollable.
3. **VERDICTS** — resolved calls, **always free, never paywalled**. Each row: ticker chip, direction
   chip, serif headline, a mono line with the analyst and entry → exit with return %, and the angled
   seal. Horizontally scrollable. Header note: "Calls the market just graded · always free". This
   doubles as the best logged-out page Stoa has — it must make sense to someone who has never heard
   of the product, and should be server-rendered and indexable.
4. **A THEME CLUSTER** — a market theme everyone is covering, with a mono note showing publications
   this week. Two large items side by side, each with video, headline and byline. Horizontally
   scrollable through the theme's other coverage.
5. **MARKET NEWS** — from Yahoo Finance, deliberately quiet: a compact two-column list of headlines
   with source and time in mono, no images, no large type. Context, not the point. Placed last.
   Source marked on each item so Stoa research is never confused with wire news.

Close with a quiet centred "That's today's issue · check back tomorrow."

### Scrolling behaviour — the defining pattern
Every band that can hold more items than fit is **independently scrollable** — the reader scrolls
that section horizontally without moving the page. Each has previous/next arrows at the right of its
header, disabled when there is nothing further that way.

### Mobile
The sidebar becomes a **collapsible left drawer** — closed by default behind a control in the
header, opening as a panel over the page from the left edge, with the same grouped lists, each
independently scrollable. Do **not** flatten the sidebar into a horizontal chip strip; that loses
the point of it. The lead stacks. Every band keeps horizontal scrolling by swipe. Trending Now
collapses to five with "See more". Market news stacks.

---

## 5. Surface: Explore — new surface

Route: `/explore` (currently a heading-only placeholder).

**What it is.** Stoa has three discovery surfaces separated by intent. The **Feed** is infinite
vertical video scroll — passive, "surprise me". **Explore** is on-demand: a wall of faces the user
scans and chooses from. **Today** is the curated daily read. Explore's whole job is to let someone
scan many faces and pick what to enter — it is a chooser that hands off to the Feed, not a separate
reading experience.

**The grid.** Six columns desktop, three mobile, 4px gaps, tiles at 4:5 portrait. 24–30 tiles so the
density reads.

**Tile sizes driven by trending.** Three sizes: standard (1×1), medium (2×1), spotlight (2×2). The
strongest-trending items get spotlight, the next tier medium, the rest standard. Because trending
measures **velocity**, new content can earn a large tile — the point is that popularity does not
compound into permanent occupancy of the big slots. The result must look irregular and organic, with
no detectable repeating pattern.

**Gap-free packing is a hard requirement.** The grid must never show an empty cell. Place large tiles
first, then flow standard tiles into remaining space. If a large tile cannot fit without leaving a
hole, push it to the next row or demote it to a smaller size — never leave a cell empty. The last row
must also be complete. `grid-auto-flow: dense` is the mechanism if needed.

**Each tile overlay:** a dark scrim gradient rising from the bottom (transparent at ~60% height,
~55% black at the base) so text stays legible over any thumbnail. Top-left: ticker chip and direction
chip, or a single theme chip for callless items with no direction chip. Top-right: a small quiet play
glyph. Bottom-left: the serif headline in white, max two lines, subtle text shadow, and the analyst's
name beneath. Bottom-right: duration in mono. **No score, no follower count.** Spotlight tiles get a
larger headline plus the deck line and a small mono `TRENDING` marker. Chips must stay legible over
unpredictable thumbnails — the scrim only covers the lower portion.

**Header:** serif `EXPLORE` with a mono dateline, and two quiet mono dropdowns on the right of the
title row: `TICKER ▾` and `SECTOR ▾`.

**Ticker-filtered state.** Clicking a ticker filter shows only that ticker's tiles — the "I saw NVDA
in the Feed and now want every take on it" view. Header becomes serif `NVDA` with a mono sub-line
`EVERY TAKE ON THIS NAME` and a small `← All of Explore` back link. **No summary or consensus strip**
— the grid itself shows the range of opinion, and we do not give away the conclusion.

**Clicking a tile opens the Feed player at that item**, in the Feed's own architecture: the same
framed video stage, the same overlays, vertical navigation between publications, horizontal
navigation through that publication's cards. On desktop it opens as a full-screen overlay above the
grid, which dims behind it; closing returns to the exact scroll position. On mobile it opens
full-bleed with a back chevron. Keyboard: ↑/↓ between publications, ←/→ through cards, double-→
jumps to the final unlock card, `M` mutes, `Space` pauses, `Esc` closes.

---

## 6. Surface: Markets — completion

Explore view and the stock page already exist. This adds the rest.

### Chart timeframes
The instrument chart's toggle becomes `1D · 1W · 1M · 6M · 1Y · 5Y · CUSTOM`.
- Add 1D and 1W. Report whether the data layer supports intraday for 1D; if not, use the shortest
  honest interval and say so. Do not fake granularity.
- `CUSTOM` opens a small from/to date picker. Report whether the provider supports arbitrary ranges;
  if not, snap to the nearest supported range and say so.
- **On 1D, hide the analyst calls overlay entirely** — no target lines, no entry dots, no seals — and
  show a quiet mono note where the legend sits: "Analyst calls are shown from 1W and longer." Call
  horizons run weeks to months, so on a single day the target lines sit far off-scale and mislead.
  Every other timeframe keeps the overlay as built.

### The running ticker tape
Replace the static strip with a **continuously scrolling horizontal tape** beneath the header — the
stock-ticker device from a financial newspaper. It carries the major indices, key commodities,
volatility, and the most-covered tickers on Stoa. Each entry: ticker in mono, price, day change
(reserved slot where unavailable). Motion slow and continuous, background texture rather than focus.
Pauses on hover; each entry clickable through to that instrument. Visually quiet — mono, hairline
rules, low contrast. A newspaper's tape, not a casino board.

### Deeper themes
- Each theme card gains **momentum**: publications this week versus last, so a heating theme is
  visible. **No stance aggregate** — no long/short counts.
- Add a **theme page**, structured like the sector page: constituent names with prices, publications
  about the theme (including callless commentary tagged to it), the analysts most active in it, and a
  short editorial paragraph explaining what the theme is. Coverage counts and momentum only.
- Show 6–8 themes on Explore rather than 5, editorially curated.

### The sector page
Sectors are first-class: taggable, followable, and they own a page. Header: serif sector name, mono
`SECTOR`, a sector index level with a day-change slot, a mono meta row (`N NAMES COVERED · N ANALYSTS
ACTIVE · N PUBLICATIONS THIS WEEK`), a prominent Follow control, and a `← MARKETS` breadcrumb.
- **Performance:** a line chart of the sector against the S&P over a selectable timeframe. If sector
  index data does not exist, say so and render the section's structure rather than inventing a line.
- **The names:** 8 constituents — ticker, company, price, day-change slot, mono `N PUBLICATIONS`.
- **Publications in this sector:** 5 headline rows mixing tickered calls *and* callless commentary
  tagged to the sector. At least two should be NOTES with theme chips and no ticker — this band is
  the discovery path for macro and theme content, which exists nowhere else.
- **Most active analysts in this sector:** 4 analysts ordered by POPULAR within that sector — no
  ranking numbers, no scores. `NEW` or `TRENDING` markers may show where they apply.

### The ETF page, with live symbol resolution
The instrument table is equities-only with no asset-type column, so:
- The **ETFs band** on Markets Explore uses a **curated list in config** (editorial, same pattern as
  Themes), editable without a deploy. Use these fifteen: SPY, QQQ, VOO, VTI, IWM, DIA, SMH, XLE, XLF,
  XLK, SOXL, TLT, GLD, VXX, ARKK.
- The **ETF page and search resolve any symbol live** from the market data provider, not from the
  instrument table. Someone searching `SMH` reaches a page whether or not it is on the curated list.
- Where the provider does not return something (holdings, flows, sector exposure), **hide that
  section** rather than showing it empty. Report which fields the provider actually gives.

An ETF has a different data shape from a stock — no P/E, no margins, no earnings. Do not render a
stock page with empty fields. Header: serif fund name, mono `TICKER · EXCHANGE · ETF`, price with
day-change slot, mono meta row (`AUM · EXPENSE RATIO · 30-DAY AVG VOLUME · INCEPTION`), Follow
control. Then: the same call-annotation chart (same 5-line cap, consensus band, 1D rule); top
holdings (8 rows — ticker, company, weight %, day-change slot, `N STOA PUBLICATIONS` so a reader can
jump into covered names); flows; sector exposure; and Stoa activity on the ETF.

### The instrument sheet
A compact instrument panel — roughly 480px, right-anchored, over a dimmed background — used when an
instrument is tapped from **another surface** without navigating away. Contents in priority order:
header (name, ticker, price, change slot, Follow), a smaller annotated chart (3 target lines max),
the coverage block, 3 open calls, and an `Open full page →` link. Build it as a reusable component
and demonstrate it opening from a ticker chip on Today. On mobile it becomes a bottom sheet.

### Market news
A quiet band from Yahoo Finance, low on the page, beneath the Stoa-native bands. Compact headline
list with source and time in mono, no images. On instrument pages, a small ticker-specific
equivalent beneath the Stoa content.

---

## 7. Surface: Compose — the video editor

Compose is a progressive ladder: the video is the seed, and call, cards and thesis are optional
modules the creator expands inline. These additions sit at the **video rung**.

### Thumbnail creation
The thumbnail is the click target wherever the video appears — Explore tiles, the profile video
shelf — so give it real presence. Two paths: **pick a frame** (a filmstrip of extracted frames the
creator scrubs and selects from) or **upload** an image. Show the chosen thumbnail at the aspect
ratio it will actually appear at (portrait 4:5), with a mono note that this is what people click.

### The video editor
A mini editor beneath the video preview: trim, text overlays, visual overlays.

**The timeline.** A horizontal track showing the video's full duration with time markers and **two
stacked tracks** — `TEXT` (upper) and `VISUAL` (lower). Events sit on their track as blocks: drag to
move in time, drag edges to change duration, click to open settings. Events on the two tracks may
overlap — text labelling a chart cutaway is a primary use case.

**Precise playhead control**, because dropping an overlay at "roughly 12 seconds" is not good enough:
- A draggable playhead marker; clicking anywhere on the track jumps there.
- A mono current-time readout (`0:12.4`) that is **editable** — type a timecode and the playhead
  moves.
- Frame-step controls: small arrows nudging one frame, and left/right arrow keys doing the same when
  the timeline has focus.
- The preview updates live as the playhead moves, so the creator always sees the exact frame.
- When an event is selected, its start and end times show as editable mono values.
- A **zoom control**, so a 90-second video can be expanded for fine placement rather than every
  second being a few pixels wide.

**Trim:** handles at both ends. Nothing more — no cutting middle sections.

**Text overlay settings:** the text, position on the frame (a nine-point grid), and size. Minimal —
this is a caption, not a design tool.

**Visual overlay settings:**
- **Source:** a generated card (the Card Engine already produces evidence cards from the thesis — a
  price chart with entry and target drawn, peer comparison, key stats), a figure already in the
  thesis body, a live price chart for a ticker, or an upload.
- **Display mode, chosen per event:** `FULL-FRAME CUTAWAY` (the visual fills the screen, the camera
  disappears, the analyst's voice continues) or `INSET` (the visual sits over part of the frame, face
  still visible) with a position choice.
- Duration comes from the block's width.
- Show at least one of each mode, and show the preview at a moment where a cutaway is active — so it
  is visible that the face is gone and only the chart shows.

**Audio never stops.** A cutaway hides the picture, not the sound. Say so in the interface so the
creator is not unsure whether they are cutting their own audio.

**The preview must be exactly faithful.** Overlays **burn permanently into the video at publish** —
there is no editing them afterward. A "Preview with overlays" control plays the video exactly as it
will publish, scrubbable, with a clear note that overlays are permanent once published.

**Naming rule:** these are **not** "cards". Cards are the separate swipeable evidence stack. Call
these **video overlays** throughout so the two are never confused.

### The processing state
Because overlays burn in, publishing takes time. Design what the creator sees after hitting publish:
the publication exists but the video is still processing. It should read as progress, not a hang —
what is happening, roughly how long, and that they can leave the page. Also show how a processing
publication appears in the Publications list.

**DECISION REQUIRED — burn-in implementation.** Burning overlays into the video requires server-side
video processing that does not exist. Report what would be needed (processing service, queue, cost
model) and **do not build a fake processing state that never completes**. Build the interface; stop
and report on the pipeline.

### Extended tagging
Keep the current model exactly — closed curated list, one **primary** tag that drives discovery
placement, up to two **secondary** tags that are searchable only, three total. Extend the list with
more categories and make the primary/secondary distinction more visually obvious. Tags are data, not
hard-coded strings, so the taxonomy can change without a deploy. Auto-fill the primary from the
call's ticker sector when a call exists, overridable with one click; no auto-fill when there is no
call.

---

## 8. Surface: Feed

### Content badges and anchoring
Add the content badge to the video overlay, and apply the anchoring rule: callless items show no
ticker, no direction chip, no seal — a theme or sector tag instead. Include at least one callless
NOTE in the feed so both styles are visible side by side, and confirm the callless one does not look
broken next to a call.

### New evidence card formats
Add these as stack cards in the editorial paper styling: **The Edge** (two ruled columns, `THE STREET
SAYS` / `I SAY`), **Path to Target** (the target maths as an equation stack), **The Kill Switch**
(`I'M WRONG IF —` with one or two invalidation conditions in a hairline box), **Catalyst Timeline**
(three dated events, future in ink, past in grey), a **generated checklist** card (mono rows with
status glyphs), and a **figure card** (a graph from the thesis body with its caption as the title).

### Three-ink tags
Every card carries provenance: plain text = the creator's view; a small mono `CREATOR EST.` tag = the
creator's own number; a small mono `AUTO` tag = imported market fact, non-editable. Figures carry
`CREATOR CHART` when creator-made and `AUTO` when platform-generated.

### Sealed locked cards
The creator controls which cards are free and which are paid, per card. A locked card appears in the
stack **sealed** — blurred content with a small lock mark — rather than being skipped. Tapping a
sealed card jumps to the unlock CTA card.

### The Steelman card
The Steelman is a published artifact: an objection from the Devil's Advocate tool paired with the
analyst's answer. As a stack card: mono header `THE STEELMAN`, the objection quoted in a recessed
treatment labelled `THE COUNTERPOINT`, the analyst's answer beneath labelled `THE
COUNTER-COUNTERPOINT`, and a mono footer "The analyst chose to be challenged and answered on the
record." Its free/locked setting is independent of its placement on the report page. Build both
states — free (full exchange) and locked (sealed, objection headline only).

### Stage markers
If `NEW` or `TRENDING` applies to a publication or its analyst, show it as a small quiet mono marker
on the overlay. Nothing else about stages is visible.

### Discussions — make it a real discussion
- Each comment can be replied to. **One level of nesting only**: replies indent beneath their parent,
  and a reply to a reply is flattened into the same level with an @mention. Deep indentation breaks
  on mobile.
- Each comment and reply: avatar, name, time, text, a reply action, a like count. No score, no
  follower count.
- The analyst's own comments are marked with a small mono `AUTHOR` tag — an analyst answering a
  question is the most valuable thing in the thread.
- Sort by newest by default, with an option for most-liked.

---

## 9. Surface: Landing page

What a logged-out visitor sees at the root. Two constraints in tension — hold both.

**Show without giving away.** Headlines and previews only. Never a full deck, never a readable
thesis. A visitor should leave wanting in, not feeling they have read today's issue.

**It must feel alive.** This is a live marketplace, not a brochure. Motion should feel like a trading
floor seen through a newspaper's typography — never a marketing site with animations bolted on.

**What creates the life:** the **running ticker tape** beneath the hero (the strongest signal the
platform is live); the **lead video autoplaying muted on loop** (a person talking is the product; a
static thumbnail is a poster); the **seals arriving** as the visitor scrolls to them, a small
rotation and settle, staggered; a **live activity line** in mono (`37 PUBLICATIONS TODAY · 14
ANALYSTS · 6 CALLS RESOLVED`); a **large irregular wall of faces**, twenty-plus portraits at mixed
sizes, gap-free, with a subtle hover lift; and **restrained scroll reveals** — sections fading and
rising slightly, a newspaper settling into place.

**Section 1 — the doors** (first screen). The STOA wordmark large and centred, tagline "Think
clearly. Invest better." beneath. One short serif line stating what the platform is. Two actions side
by side: `Sign up` solid ink, `Log in` outlined. The live activity line beneath. A quiet mono "or
scroll to see today ↓". Then the ticker tape across the full width. Spacious and calm — the cover of
a serious publication. No gradient, no illustration, no product screenshot.

**Section 2 — Today, lite.** A glimpse showing only what is popular platform-wide, no
personalisation. A mono masthead strip; the autoplaying lead video with a mono kicker, serif
headline, and a byline with name plus ticker and direction chips — **no deck, no summary**; four more
headlines beneath (kicker, serif headline, analyst name, nothing else); the section fading at its
lower edge into the paper so the withholding is visibly deliberate; a closing mono line "Members get
the full issue, shaped around what they follow."

**Section 3 — split in half**, two equal columns divided by a hairline rule. Left: **most popular
verdicts** — five resolved calls with ticker chip, direction chip, serif headline, analyst name,
entry → exit with return %, and the animating seal. Include at least one MISS. Mono note: "Every call
is recorded when it's published and graded by the market. Misses stay visible." Right: **most popular
creators** — the wall of faces, each with a name and a one-line specialty, no metrics of any kind.
Beneath the split, centred: the two actions repeated with one short serif line above.

**Footer** — the product currently has none: about, terms, privacy, contact, and the compliance line
"Stoa publishes research and education, not investment advice."

**Mobile:** single column; section 1 full-height with both buttons centred on load; the tape still
runs; the lead video still autoplays; the split stacks (verdicts first, then faces at three columns).

---

## 10. Deliverable: the backend brief for Krisi

Write `docs/BACKEND_BRIEF.md` — a single document handing the backend work to the technical
co-founder. He is technical; this one does not need plain language, but it must be precise and
complete.

**Structure it around the four cross-cutting concerns, applied to every item:**
1. **Scalability** — query patterns, N+1 risks, pagination, indexing, what breaks at 10× volume.
2. **Caching** — what is cached and for how long, invalidation triggers. Anything touching a locked
   call, a resolved outcome, or a score must never serve stale.
3. **Rendering** — server vs client components, what must be server-rendered for SEO (Verdicts is
   the shareable, indexable surface), streaming boundaries, and the absolute rule that gated content
   is never sent to the browser.
4. **Regionality** — CDN edge distribution for video, storage region, latency for Israeli and US
   users, data-residency implications.

**The accumulated gap list**, in priority order:

- **Video — the largest item, and it blocks Feed and Explore entirely.** No video entity exists: no
  video records, thumbnails, durations, or view/watch metrics. Needs a data model plus a
  storage/transcoding/streaming decision (Supabase Storage vs Mux/Cloudflare Stream), adaptive
  bitrate, thumbnail generation, and per-minute cost modelling. **Plus** the overlay burn-in
  pipeline: publishing must composite timed text and visual overlays into the video file, which means
  a processing queue and a publish-time job.
- **Instrument follows.** No server-side model — ticker follows are browser-local today and ETF and
  sector follows do not exist. Needs a follows table (owner, kind, symbol) covering creator, ticker,
  ETF and sector. This underpins Today's personalisation, Markets' follow controls, and the
  engagement algorithm's affinity term.
- **Day change on the batch quote path.** The multi-symbol path drops the previous close, so day
  change cannot be computed for any list. The single-symbol snapshot already carries it. Carrying one
  extra field through the quote providers unblocks the tape, movers, sector rows, peers, and every
  list on Markets and Today.
- **Publication metadata.** No content-badge field recording what a publication contains; no
  evidence-cards data (the Card Engine is not in the backend); no theme/sector tag field for
  tickerless items; no scheduling field.
- **The lifecycle stages.** NEW / AVERAGE / RISING / TRENDING / POPULAR need computing from
  engagement events. Trending is velocity, not accumulated volume — it needs a time-windowed rate,
  not a running total. This is what replaced score-based ranking and it now drives Explore's tile
  sizes, Today's placement, and the Feed's ordering.
- **Engagement events.** The engagement-driven ordering algorithm needs instrumentation:
  impressions, watch completion %, swipe depth (max card reached), CTA reach, unlock and subscribe
  conversions, follows from a surface.
- **Notification types.** The backend emits only like / comment / follow / publication / subscribe /
  sale — all of which are "good to know". The "needs you" types do not exist: a followed call
  resolving, a subscription renewing soon, a payment problem, the analyst's own call resolving, a
  payout ready, a horizon approaching. Also missing: notification preference storage.
- **Pricing consolidation.** Two parallel systems. The `plans` table (rich tiers) drives tier
  subscriptions and report gating. The legacy flat `sub_price` / `report_price` still drive the
  *fallback* subscribe price and the *default* report unlock price, and are edited in two duplicate
  places. Consolidating means deciding where those two fallbacks come from once tiers are the only
  system — plus a hardcoded `/pricing` marketing page that should read from a shared constant.
- **The scoring formula is unresolved.** The docs describe a modified Elo (600–1400); the shipped
  engine computes a Wilson win-rate / profit-factor / alpha composite. These are different systems.
  The formula is isolated and versioned and a recompute path exists, but a `formula_version` column
  is needed on `profiles` and `moat_score_snapshots` to persist which formula produced a score.
  Scores are no longer displayed publicly but the engine still runs, so this must be settled before
  they are ever shown.
- **Server-side paywall.** Gated content must never be sent to the browser. Confirm this is enforced
  server-side per-card, since the creator sets the reveal line per card, not just on the report body.
- **Smaller items:** privacy toggle field ("show who I follow"); avatar and cover image upload to
  storage; account deactivation; subscription tier names on the subscription row; a "most popular"
  tier flag; per-publication unlocks and revenue aggregation; subscriber growth time series; boost
  live stats, pricing and history; payout history records; sector index data; and the repo lockfile
  being out of sync with `package.json`.

---

## 11. Final pass: self-audit

After all surfaces are built and committed, do a full audit and report. This is the last step and it
matters more than any individual surface.

**Imports and integrity.** Every import resolves. No component rendered that no longer exists. No
dead imports left behind by removals. No client-only module imported into a server component — this
once produced an HTTP 200 with an empty page and neither typecheck nor build caught it.

**Every route loads.** Walk every route in the app, logged out and (where possible) logged in.
Confirm each returns content, not just a 200. Check the browser console for errors on each.

**Both widths.** Every surface at 1440 and 390. Look for overflow, cramped rows, text truncation,
controls that fall off the edge, and anything that reflows badly.

**Design-token consistency.** No hardcoded hex where a token exists. No font sizes below the defined
minimum. Primary buttons are ink, never green. Metadata text meets 4.5:1 contrast. Green and red
appear only on semantic elements.

**Component consistency.** The same chip, seal, badge, button, and row components everywhere — no
surface with its own hand-rolled version of something shared.

**Content-model consistency.** Content badges present on every item on every surface. The anchoring
rule applied everywhere (callless items never show a ticker, direction chip, or seal). No score,
rank, or aggregate stance anywhere public.

**Empty and error states.** Every list and band has a dignified empty state — no blank pages, no
broken layouts when data is absent. New-analyst profiles should feel sparse but intentional.

**Then report:** what you built, what you fixed, what is placeholder and why, what needs Krisi, and
anything you found that looks wrong but that you did not change because it was outside the spec.
