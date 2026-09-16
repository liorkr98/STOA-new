# Compose: four publication types, one spine

The authoring model. This is the source of truth for `/studio/compose`.
`docs/PRODUCT_MODEL.md` describes the public surfaces; this file describes
how an analyst actually publishes.

## The four types

Compose opens by asking what the analyst is trying to do. Four types,
described by purpose rather than format, each saying who sees it:

| Type | Purpose | Seen by | Stored as |
| --- | --- | --- | --- |
| **Video** | Reach people who don't know you. The only type on the Feed and in Explore. | Everyone, including strangers | `content_type = video` |
| **Brief** | Stay present between big pieces. A short written take, at most 300 characters. | Your followers | `short_post` |
| **Thesis** | Prove you are worth paying for. A full written report, the strongest route onto Today. | Buyers and subscribers | `research` |
| **Verdict** | Make a call only the market can settle. Subscribers get it first; public the moment the market resolves it. | Subscribers now, everyone at resolution | `call` |

The type is chosen on the picker and stored with the draft. It does not
change afterwards: a brief that grows into a thesis is a new thesis. The
public type label everywhere on the site is the type's name (VIDEO, BRIEF,
THESIS, VERDICT).

The four map onto the four values the database's `content_type` enum already
has, so no migration was needed to remember a draft's type. `call` now means
a verdict; older `call`-type rows reopen as verdicts.

**The picker.** Four cards on a desktop; on a phone four compact rows, all
above the fold, whose detail opens on a tap. The verdict card carries its
one-per-30-days rule and, once this month's is used, says when the next one
unlocks (as anticipation, not a refusal). Under the cards, every draft: type,
headline, when it was last touched, and how far along its three steps it is
(`src/lib/compose/drafts.ts` derives this from what is stored, never from a
recorded step). A draft opens at the first step it has not finished. The
route is `/studio/compose` with nothing after it; `?type=video` starts a
type, `?id=` reopens a draft.

## The spine: never more than three steps

Every type walks the same short mandatory spine, then reaches the publish
screen:

| Type | Step 1 | Step 2 | Step 3 |
| --- | --- | --- | --- |
| Video | the video | headline | tags |
| Brief | the take (short text) | headline | tags |
| Thesis | the report (the full writer) | headline | tags |
| Verdict | the call | headline | tags |

The headline and the tags are mandatory on every type. The headline step
shows where the line will travel (a Today row, an inbox, a pasted link) so
the analyst writes for the places it is read. The tags step is a list you
type into (below).

**One button per screen, and its label is what pressing it does.** On the
spine it reads **Continue**, and when the step is not done it refuses and
says what is missing beside the button, in the creator's terms ("Add a
video first. Record one, or upload one", "Write the take first", "A verdict
needs a target price. It is what the market settles PLAB against", "Choose
a primary tag"), staying put until it is fixed. In a feature editor it reads
**Skip** when nothing has been added, **Done** when the feature is complete,
and Done that refuses and names what is missing when it is half done.
Partial information never passes. The rule is `advanceFor` in
`src/lib/compose/steps.ts`; the publish button reads every spine step and
every feature through the same function, so a half-entered call cannot go
out.

The first pass guides: a step not yet reached is dimmed and not clickable in
the tracker. Reaching the publish screen unlocks every step as a tab.

## The features menu: on the publish screen, never as steps

What a publication may add on top of its spine is a menu on the publish
screen (`featuresFor` in `steps.ts`):

| Type | Can add |
| --- | --- |
| Video | a call, cards, a full thesis |
| Brief | a call, cards |
| Thesis | a call, cards |
| Verdict | cards, a video, written text (a brief or a thesis under the call) |

Each row says what the feature is and whether it has been added (`NVDA ·
long`, `4 cards`, `1,840 words`, `0:58`). Opening one goes into that
feature's editor and Done brings you back to the menu. A feature opened and
left half done says so on its row in the same words the publish button
refuses with. Nothing here is a step in a sequence.

A call added as a feature keeps the older, wider rules: any priceable name,
including the macro instruments (gold is XAUUSD, WTI crude USOIL, Brent
UKOIL, the ten-year US10Y, bitcoin BTCUSD), long, short or hold, a target
that is optional. Only a locked call is graded.

## The verdict's rules

A verdict is the platform's proof-and-conversion mechanic, so its rules are
tighter, and they are said as the analyst types rather than at publish
(`src/lib/compose/verdict.ts`, `VerdictCallPanel`):

- **Equities only, under a $2B market cap.** The ticker is looked up as it is
  typed; the listing's market cap sits beside its name, a verdigris tick
  says "Eligible. Under the $2B cap", and a name over the cap is refused with
  its size named ("NVDA is a $4.9T company"). A macro instrument is refused
  in plain words: it has no market cap, and a verdict is a call on a
  company. A listing whose market cap is not on file yet is refused rather
  than guessed at.
- **Direction is long or short.** The market cannot settle a hold.
- **A target price is required.** It is what the market settles against.
  The entry is the live level the call will lock at; the move to target is
  printed beside it and reads in rust when it goes against the call.
- **Horizon between 7 and 180 days**, on a slider, with the resolution date.
- **One verdict per analyst per rolling 30 days**, rolling from the moment
  the last one went out. When the window is closed the picker and the call
  screen say when the next one unlocks; the draft still saves and publish
  refuses with the same line.
- **Subscribers-only while open, public on resolution.** The publish screen
  states this in a ledger card instead of offering an access setting, and
  says plainly what the server does today (below).

The server reads the same rules again at publish (`enforceVerdictRules` in
`src/lib/reports/publish-report.ts`) and forces a verdict to
subscribers-only, so nothing the screen refused can arrive by another route.

**What the backend does today, and what it does not.** The rate limit, the
market-cap check, the horizon bound and the completeness check all run on
the server now, reading the listing's `market_cap` (refreshed by the ticker
metrics job) and the author's own published verdicts. Two halves of the
visibility rule are not built: the written text is gated to subscribers by
the existing `report_bodies` policy, but the call itself (ticker, direction,
target on `predictions`) is readable by anyone who opens the publication,
and nothing flips the publication public when the resolution engine settles
it. The publish screen says so rather than pretending. Both need Krisi (see
`docs/CHANGELOG.md`).

**Draft calls between sessions.** Migration 0065 adds `draft_direction`,
`draft_target_price` and `draft_horizon_days` on `reports`. Compose writes
them in their own statement after the draft row, so before the migration is
applied a draft still saves and the call screen says the three stay in the
tab until then. Only the ticker survived a reopened draft before.

## Tags: type to narrow

Choosing a tag opens a list you type into, the same pattern as Explore's
filters (`TagSearch` in `src/components/compose/tag-picker.tsx`). Before
anything is typed the most-used tags across published work come first
(`listTagUsage` in `src/lib/db/reports.ts`), then the whole list by group.
Typing narrows to one flat list, names that begin with the query before
names that merely contain it; arrows move, Enter picks, Escape closes. The
list is closed: when nothing matches it says so and points at the sectors
and themes. One primary tag drives placement; up to two secondary tags are
searchable only. The primary auto-fills from a call's sector, one click to
change.

## Assistant (left)

Everything AI lives in the left **Assistant** rail, on the screens that build
something (the writer, cards, the video):

- Ask AI
- Fact-check (any type with a writer)
- Visualize selection
- Templates
- Generate cards, charts, structure, tighten, headlines, Devil's Advocate

Nothing AI belongs in the top bar. The rail also carries the card tray, so a
card stays draggable into the writer and onto the timeline.

## Cards

Cards are evidence. On a thesis they are the short preview of the full text.
On a video they sit on the editor and can be dropped onto the visual track.
They are a shared asset pool: the same card can be in both, a placement
stores only the card's id, and a card's id is minted on the client and kept
for life across saves.

A **Chart** card is a live tape from **TradingView** (Advanced Chart widget).
A compare line still uses TradingView Lightweight Charts, because the widget
cannot overlay a second symbol. Dummy SVG is not a source.

Editing a card ends with **Done**: it closes the editor and, on a draft, runs
the same save the header makes. Done means finished for now, never locked.

The **Steelman** card is parked (see `docs/PRODUCT_MODEL.md`): not offered in
the library until the analysis that supplies the objection works. Existing
Steelman cards still render.

## Recording a clip

The video screen offers two ways in: **Record with your camera** and the
upload drop zone. Record opens a portrait stage (9:16, the Feed's frame) that
first says why the camera is needed and only asks for it on **Turn on
camera**; refusal, a busy camera and a device with no camera each get their
own plain message with **Try again** and **Upload a file instead**. Live,
there is a mirrored preview, a shutter, and once recording starts a REC clock
with the time left (the cap is the same 90 seconds as an upload). **Pause**
beside stop holds the take with the camera still live; **Resume** carries on
in the same take. Stop lands on a review of the take with **Record again** or
**Use this clip**. A laptop webcam's landscape picture is recorded through a
canvas that keeps its middle 9:16.

The take becomes an ordinary File and goes down the upload path from there:
the same trim, cover, overlays and the same upload at publish. There is no
second path. A chosen clip is held in the tab until publish, because a clip
row can only hang off a locked report; a reopened video draft therefore
starts at the video step again, and the picker says so.

Support is `getUserMedia` plus `MediaRecorder` on a secure origin. Where the
browser cannot record, Record is not offered and a line under the drop zone
says so.

## The video editor

Unchanged in this batch and rebuilt next: one picture above one timeline,
trim by dragging the brass ends of the filmstrip, text and insets dragged
on the picture, timed by dragging the ends of their bar. Overlays are stored
with the publication (`reports.video_edit`) and drawn by Stoa's player over
the clip, from the same renderer as "Preview as it will publish". They are
not composited into the video file: a clip shared or downloaded elsewhere
plays without them, and the editor says so under the timeline.

## Saving

There is no Save draft button. The draft saves itself: every thirty seconds
while there are unsaved changes, on every screen change, when the tab goes
to the background, when a card's editor closes with Done, and before leaving
through the dialog below. The true state sits in the header on a desktop
(`DRAFT · SAVED JUST NOW`) and beside the forward button on a phone, and it
never goes quiet: "Unsaved changes", "Saving…", "Saved just now" (then
"Saved 3 min ago"), or "Not saved: <reason>" in rust when the server refused.
Any change counts, not only words.

Leaving with unsaved work is never silent. A reload, a closed tab or a typed
address gets the browser's own prompt. One of the app's own links opens a
dialog with three choices: save and leave, leave without saving, or stay.
Publishing navigates on purpose and is never interrupted.

Editing a live publication is the one place a button stays: **Save changes**
in the header, because an edit files a public EDITED marker and must be
meant. The call and the clip are the record and cannot change; their rows
on the features menu open to be read.

## Access

On a video, a brief or a thesis, three modes on the publish screen:

1. **Free.** Anyone.
2. **Subscribers.** Members only (optional plan rank and perks).
3. **Paid unlock.** One-time purchase. The analyst can also tick **Members can
   open this without paying**.

A verdict has no access setting: it is subscribers-only while open, stated
on the publish screen.

## What does not change

The public surfaces stay video-first. There is still no Discover. A locked
call is still the only graded element. A brief does not run the
fact-checker. The card tray and library, drag into the timeline and into
the writer, card identity across saves, the assistant, three-ink
provenance, per-card locking, the recorder, the upload path, edit markers on
published work and delete-versus-archive are all as they were.
