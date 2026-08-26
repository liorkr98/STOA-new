# Compose: Video, Research, Post

The authoring model. This is the source of truth for `/studio/compose`.
`docs/PRODUCT_MODEL.md` still describes the public surfaces; this file describes
how an analyst actually publishes.

## What was wrong

Compose asked the analyst to pick **Research / Call / Post**. Call is not a
format. It is a locked prediction that can sit on a video, a research note, or a
short post. The screen also hid the card tray in a left rail, so the person
editing a clip had to leave the editor to place evidence. Templates and
Visualize sat in the top bar even when there was no thesis to template.

## The three formats

One publication is one format. You pick it first, then you fill it.

| Format | What it is | Goes to the Feed | Written body |
| --- | --- | --- | --- |
| **Video** | A talking-head clip | Yes. Short: the whole clip. Long: the first 45 seconds as the preview; the rest lives on the publication page. | Optional, via a **connected** Research or Post |
| **Research** | A long thesis on a name or a sector | Only if you connect a Video | The Tiptap thesis, charts, cards |
| **Post** | A short take, at most 300 characters | Only if you connect a Video | The 300-character text |

A **call** (ticker, direction, target, horizon) is optional on every format. It
is not a fourth tab. Only a locked call is graded.

## How they connect

A Video can point at one Research or one Post (`linked_report_id`). A Research
or Post can point at one Video. The link is the same column both ways: whichever
side you are on, you pick the other piece from your own drafts and published
work.

The Feed still only plays video. The connected thesis or post is how a viewer
goes deeper (Open research / Read the post). That is the same idea as a clip
that already had a thesis module, without forcing the analyst to write the
thesis inside the video workspace.

## Access

Three modes, same right rail on every format:

1. **Free.** Anyone.
2. **Subscribers.** Members only (optional plan rank and perks).
3. **Paid unlock.** One-time purchase. The analyst can also tick **Members can
   open this without paying**. If they do, an active subscriber is treated as
   entitled, same as someone who bought the unlock.

## Video workspace (keep it simple)

- Same right rail as Research: tags, call, access, promote, publish gates.
- No Templates. No Visualize. Those belong to the thesis.
- The **card tray sits on the video editor** (above the timeline): add a card,
  drag it onto the Visual track. The left toolbox rail is hidden in this format
  so the clip is the work.
- Short vs Long is a single choice under the player. Long sets a 45-second Feed
  preview; the analyst does not type a number.

## Charts

Live figures in Compose come from two places only:

- **Yahoo Finance** (server `src/lib/engine/market`, `/api/market/candles`,
  `/api/market/sparkline`) for quotes, OHLC, sparklines, attestation.
- **TradingView** (`chartNode` engine `tradingview`, slash item "TradingView
  chart") for the full widget.

A chart overlay on the video uses the Yahoo sparkline for that ticker, never a
drawn dummy line. Mini-charts in the editor use the same sparkline endpoint.

## What does not change

The public surfaces stay video-first. There is still no Discover. A locked call
is still the only graded element. Disclosures and fact-check still gate
Research (and any format that carries a thesis). A Post under 300 characters
does not run the fact-checker.
