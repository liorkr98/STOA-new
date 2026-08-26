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

## Visual overlays on video

A visual overlay is a real card, a live Yahoo or TradingView tape, or a
**Napkin** visual. Press Visualize on the timeline, type what the diagram
should show, generate. The overlay sits on paper with a hairline, not a dummy
line chart.

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
