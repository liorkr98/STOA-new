# Compose: Video, Research, Post

The authoring model. This is the source of truth for `/studio/compose`.
`docs/PRODUCT_MODEL.md` still describes the public surfaces; this file describes
how an analyst actually publishes.

## The three formats

One publication is one format. You pick it first, then you fill it.

| Format | What it is | Goes to the Feed | Written body |
| --- | --- | --- | --- |
| **Video** | A talking-head clip | Yes. Short: the whole clip. Long: the first 45 seconds as the preview; the rest lives on the publication page. | Optional, via a **connected** Research or Post |
| **Research** | A long thesis on a name or a sector | Only if you connect a Video | The Tiptap thesis. Cards are the **preview** of that text. |
| **Post** | A short take, at most 300 characters | Only if you connect a Video | The 300-character text |

Research and Post are text only. The video editor does not appear on those
formats. Connect a video later, from the details step.

A **call** (ticker, direction, target, horizon) is optional on every format. It
is not a fourth tab. Only a locked call is graded.

**A call is a ticker and a direction**; the target is extra. The call step
looks the symbol up as it is typed and says what it found under the field:
the company and its exchange, or the macro instrument (gold is XAUUSD, WTI
crude USOIL, Brent UKOIL, the ten-year US10Y, bitcoin BTCUSD) and its unit,
with the live level beside it as the level the call will lock at. A Treasury
tenor says its level is a yield, its target is a yield, and that up means bond
prices down. The direction starts empty and is chosen on purpose. A symbol
that resolves to nothing is refused: a call on a name that cannot be priced
can never be graded.

## Assistant (left)

Everything AI lives in the left **Assistant** rail:

- Ask AI
- Fact-check (Research)
- Visualize selection (Research)
- Templates (Research)
- Generate cards, charts, structure, tighten, headlines, Devil's Advocate

Nothing AI belongs in the top bar.

## Publish details (after Publish)

The right rail is not open while writing. Press **Publish** and a details sheet
opens, the same idea as YouTube after an upload: tags, connected piece, price
target, access, disclosures, then the real publish. Fact-check is offered in
Assistant and again on the publish step, and it is a bonus rather than a gate:
publishing never waits for it, and when it has been run its result ships with
the piece.

## Cards

Cards are evidence. On **Research** they are the short preview of the full
text. On **Video** they sit on the editor and can be dropped onto the visual
track.

A **Chart** card is a live tape from **TradingView** (Advanced Chart widget).
A compare line still uses TradingView Lightweight Charts, because the widget
cannot overlay a second symbol. Dummy SVG is not a source.

Editing a card ends with **Done**: it closes the editor and, on a draft, runs
the same save as the header button. Done means finished for now, never
locked; the card stays editable from the toolbox and the Cards step.

The **Steelman** card is parked (see `docs/PRODUCT_MODEL.md`): not offered in
the library until the analysis that supplies the objection works. Existing
Steelman cards still render.

## The video editor

One picture above one timeline, built the way CapCut, Instagram, TikTok and
Descript build theirs. Trim by dragging the brass ends of the filmstrip.
Place text and insets by dragging them on the picture; type text on the
picture itself. Time anything by dragging the ends of its bar under the
strip. The controls for a thing appear only while it is selected; at rest
there is play, the strip, and five things to add: Text, Card, Chart,
Visualize, Image. The cover is a folded row under the timeline.

A visual overlay is a real card, a live TradingView tape, a
**Napkin** visual (type what the diagram should show, generate), or an
uploaded image, shown over the picture or full frame while the audio
continues. An inset is resized by dragging its gold corner on the picture
(a slider does the same from a keyboard or a phone) and given an opacity;
full frame fills the picture with the visual, scaled to the stage, the video
dimmed behind it, and text or insets on the same seconds wait until it is
gone. Overlays are stored with the publication and drawn by Stoa's player
over the clip, from the same renderer as "Preview as it will publish", so the
preview is exactly what plays on the site. They are not composited into the
video file (no burn-in worker exists): a clip shared or downloaded elsewhere
plays without them, and the editor says so under the timeline.

## Saving

There is no Save draft button. The draft saves itself: every thirty seconds
while there are unsaved changes, on every step change, when the tab goes to
the background, when a card's editor closes with Done, and before leaving
through the dialog below. The true state sits beside each step's forward
button, where the creator is already looking, and it never goes quiet:
"Unsaved changes", "Saving…", "Saved just now" (then "Saved 3 min ago"), or
"Not saved: <reason>" in rust when the server refused. Any change counts,
not only words: the headline, the dek, the call, access and price, the tags,
the cards and the video edit all mark the draft unsaved.

Leaving with unsaved work is never silent. A reload, a closed tab or a typed
address gets the browser's own prompt. One of the app's own links (the top
nav, the phone tabs, the Studio arrow) opens a dialog with three choices:
save and leave, leave without saving, or stay. Publishing navigates on
purpose and is never interrupted.

Editing a live publication is the one place a button stays: **Save changes**
in the header, because an edit files a public EDITED marker and must be
meant. The status line still says when edits are unsaved.

## One button per step

Each step has one forward button whose label is what pressing it does:
**Skip** on an optional step that holds nothing, **Continue** otherwise. When
Continue cannot advance, the reason is said beside the button in the
creator's terms ("A target price needs a ticker", "A call needs a direction",
"NVDAA was not found") and nothing moves until it is fixed. Partial
information never passes: a step can only be skipped when it is genuinely
empty. The rule lives in `advanceFor` in `src/lib/compose/steps.ts`, and the
publish button reads the call step's verdict too, so a half-entered call
cannot go out.

## Access

Three modes, filled in at the details step:

1. **Free.** Anyone.
2. **Subscribers.** Members only (optional plan rank and perks).
3. **Paid unlock.** One-time purchase. The analyst can also tick **Members can
   open this without paying**.

## What does not change

The public surfaces stay video-first. There is still no Discover. A locked call
is still the only graded element. A Post under 300 characters does not run the
fact-checker.
