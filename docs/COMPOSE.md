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
target, access, disclosures, then the real publish. Fact-check stays in
Assistant; the details sheet will refuse to finish until it has been run on a
Research thesis.

## Cards

Cards are evidence. On **Research** they are the short preview of the full
text. On **Video** they sit on the editor and can be dropped onto the visual
track.

A **Chart** card is a live tape:

- **Yahoo Finance** via `/api/market/sparkline`
- **TradingView** via the Advanced Chart widget

Dummy SVG is not a source.

## The video editor

One picture above one timeline, built the way CapCut, Instagram, TikTok and
Descript build theirs. Trim by dragging the brass ends of the filmstrip.
Place text and insets by dragging them on the picture; type text on the
picture itself. Time anything by dragging the ends of its bar under the
strip. The controls for a thing appear only while it is selected; at rest
there is play, the strip, and five things to add: Text, Card, Chart,
Visualize, Image. The cover is a folded row under the timeline.

A visual overlay is a real card, a live Yahoo or TradingView tape, a
**Napkin** visual (type what the diagram should show, generate), or an
uploaded image, shown over the picture or as a full-frame cutaway while the
audio continues. Overlays burn into the video at publish; "Preview as it will
publish" plays exactly what ships.

## One button per step

Each step has one forward button whose label is what pressing it does:
**Skip** on an optional step that holds nothing, **Continue** otherwise. When
Continue cannot advance, the reason is said beside the button in the
creator's terms ("A target price needs a ticker") and nothing moves until it
is fixed. The rule lives in `advanceFor` in `src/lib/compose/steps.ts`.

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
