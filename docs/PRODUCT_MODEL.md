# Stoa — Product Model

The current product model in one place. This is the reference for what Stoa is and how its
pieces fit together. For visual tokens see `docs/FRONTEND.md`; for agent working rules see
`AGENTS.md`.

## What Stoa is

Stoa is a marketplace where independent financial analysts publish stock research and market
commentary, and retail investors pay for it. The platform takes 10%.

**Grading is retired (2026-09-24).** Stoa used to lock each call's entry price, grade it against
the market at its horizon, and keep a track record and a private Track Score. All of that is gone:
nothing is graded, scored or resolved, there is no seal, no track record and no Verdict type. A
publication keeps its **stance** (below). See `docs/CHANGELOG.md` for the removal.

**There is no scoring.** No score, rating, rank, percentile, hit rate or leaderboard appears
anywhere, and no surface ever aggregates analysts into a verdict (no long/short splits, average
targets or consensus). Analysts appear as an avatar and a name; the one exception is the public
profile's audience line (`4.3K FOLLOWERS · 214 MEMBERS`, members opt-in). Placement across the
product is driven by the lifecycle model below.

## The content model (video-first)

The atomic unit of a publication is a short analyst **video**. Everything else is optional
enrichment layered on top of the video:

- **Stance** — a ticker and a direction (long, short or hold). Frozen with the ticker once the
  publication is out. Never graded.
- **Cards** — a swipeable stack of evidence (see The Card Engine).
- **Thesis** — the full written argument.

So a publication can take a stance with a full thesis and a deep card stack, or it can be
video-only commentary with no stance at all (e.g. "what the Iran escalation means for crude").

### Anchoring rule

A publication carries a **stance**: one ticker and, when it declares one, a direction (long,
short or hold), stored on the publication itself (`reports.ticker`, `reports.stance`, migration
0065). An item with a ticker shows a ticker chip, and a direction chip beside it when it has a
stance. An item with no ticker shows no ticker and no direction chip; it anchors on a theme or
sector tag instead (`MACRO · OIL & ENERGY`, `SEMIS`). Until migration 0065 is applied the
direction is read from the archived call as a fallback; nothing else is read from it. Every item
on every surface carries a **content badge** stating exactly what it contains (`VIDEO`,
`VIDEO · CARDS`, `VIDEO · CARDS · THESIS`), built only from what is stored.

### Type labels

Every publication is one of three types, chosen when it is made and printed on it everywhere:

- **VIDEO** — reach people who don't know you. The only type on the Feed and in Explore.
- **BRIEF** — a short written take that keeps existing followers and subscribers engaged.
- **THESIS** — a full written report. Depth, and the strongest route onto Today.
Any of them may carry a stance as an optional feature. The fourth type, VERDICT, was retired
with grading; migration 0067 relabels its publications as theses or briefs.

## The surfaces

Stoa is organized around five surfaces.

- **Feed** — video-first discovery, and the only one. A full-screen vertical stream: one
  publication fills the viewport, scrolling snaps to the next, the clip autoplays muted as it
  arrives and stops as it leaves. Sideways moves through that publication's evidence cards.
- **Today** — the daily editorial read. A curated, newspaper-style briefing of what matters now.
- **Markets** — instrument exploration: stocks, ETFs, and sectors, and the Stoa coverage on each.
- **Compose** — the authoring workspace where analysts build a publication: the video, the
  research, the cards, and the stance.
- **Profile** — the public analyst storefront, plus one private area that covers both the
  investor sections (library, subscriptions, following) and the creator sections (publications,
  insights, audience, earnings, storefront).

Routes: Feed is `/feed`, Today is `/home` (there is no `/today`), Explore is `/explore`,
Markets is `/markets`, Compose is `/studio/compose`, the public profile is `/analyst/[handle]`.

There is no Discover. It was the Feed's old route and old name, and both are gone: `/discover`
permanently redirects to `/feed`. The text mosaic and the video/text layout toggle that lived
there are gone with it. A publication reaches the Feed because it has a clip, and browsing the
whole catalogue as text is not a thing this product does.

Discovery is split by intent: the **Feed** is passive vertical video ("surprise me"), **Explore**
is on-demand (a wall of faces the reader scans and chooses from, each tile opening the Feed at
that publication),
**Today** is the curated daily read.

## The lifecycle model

Content and creators move through five stages: **NEW** (time on platform plus publications),
**AVERAGE** (the steady middle), **RISING** (gaining momentum), **TRENDING** (gaining fast:
velocity, not accumulated volume), **POPULAR** (established, high accumulated attention). Only
**NEW** and **TRENDING** are ever displayed; the rest are invisible mechanics that drive placement:
Explore's tile sizes, Today's lists and lead, the Feed's ordering. This replaced score-based
ranking. Thresholds live in `src/lib/lifecycle/stages.ts` as named constants; until engagement
events are recorded, attention per day since arrival stands in for a windowed velocity.

## Compose is a spine and a menu, not a wizard

Compose opens by asking what the analyst is trying to do: one of the three types above, described
by purpose. Every type then walks the same short mandatory spine (the content, the headline, the
tags; a video writes its headline under the clip, so its spine is two steps) and reaches the publish screen, where what the type may add on top (a stance, cards, a
thesis) is a menu nobody has to walk past. Instagram's structure. The full model is
`docs/COMPOSE.md`.

The workspace is still organised by one sentence: **left is what you build with, the spine is
what you publish as.** The left rail is the toolbox, and it exists only where the screen can take
what it holds: the card deck where a card can be dropped or ordered (the writer, the cards
screen, the video once a clip is loaded), the AI assistant where its reply has a writer to land
in. Everywhere else there is no rail and the current screen takes the full width.

**Cards are a shared asset pool.** They are not a step inside the video path and not a feature of
the research. They belong to the publication, they live in the left rail, and the same card can
be dropped onto the video's timeline (as a timed overlay) and into the research body (as an
inline figure). A placement stores only the card's id, so editing the card once updates it
everywhere it appears, and a placed card stays in the tray because it can be in both. Every tray
row says where its card is currently used.

The card library is organised by **intent** (make your case, prove it, compare, show the risk,
your own), because that is the question an analyst can answer about their own publication. A
Custom entry lists the same formats by **shape** for anyone who would rather pick a format than
an intent. Both routes build the same card.

**Promotion** is a section on the publication rather than a separate destination, reachable both
while composing and afterwards from the published item. Its cost model is deliberately undecided
and kept pluggable; what is fixed is that promoted content is always labelled as promoted.

A video's first step offers two ways in, record from the camera or upload a file, and both
land in the same editor: trim, cover frame, overlays, and one upload at publish. Once a piece
is live its clip is the record: the video screen opens to be read, never to be changed.

## The Thesis Stack

A publication is navigated on two axes:

- **Vertical** moves **between publications** — the next or previous analyst's thesis.
- **Horizontal** moves **through the evidence** — swiping across the current publication's cards.

Vertical is how you browse the market of ideas; horizontal is how you go deeper into one idea.

## The Card Engine

The evidence cards in a publication are organized as **three rings**, moving outward from the
analyst's argument to the broader market:

1. **The creator's case** — the analyst's own argument and the specific points they are making.
2. **The stock in context** — the individual instrument's data situated around that case.
3. **The sector in context** — the wider sector the instrument sits in.

### Three-ink integrity

Every value on a card is marked by its provenance, so a reader always knows what kind of claim
they are looking at. Think of it as three inks on the page:

- **Plain** — the creator's view. Opinion and argument, in the analyst's own words.
- **CREATOR EST.** — a number the creator supplied or estimated. Their figure, labeled as such.
- **AUTO** — a market fact pulled automatically. Non-editable, sourced, not the analyst's opinion.

The point is that a reader can never mistake an analyst's estimate for a hard market fact, or an
opinion for a number.

## Devil's Advocate and The Steelman

Two linked features that pressure-test conviction. Neither ever touches the record.

### Devil's Advocate (a paid conviction tool in Compose)

Offered in the workspace's AI assistant, alongside the tools that serve the cards and the
research, with its credit cost shown before it runs. It reads the analyst's thesis and lists
**three counterpoint headlines** as locked teasers. The analyst spends credits to unlock one, which
reveals the full objection (one or two sharp sentences). The analyst then writes a **private
rebuttal** answering it.

The purpose is to pressure-test conviction before publishing: if you cannot answer the objection,
the thesis is not ready. The AI supplies the objection; the analyst supplies the answer. It is
never a writing aid and never writes into the report.

### The Steelman (the optional published artifact)

The counterpoint paired with the analyst's counter-counterpoint, shown as a bordered box labelled
**"THE STEELMAN · THIS THESIS FACED THE DEVIL'S ADVOCATE"**. Publishing it is entirely the
analyst's choice; nothing auto-publishes.

It has two independent placements, each with its own free or locked setting:

- a box on the report page, and
- an optional card in the stack.

Because the two placements gate independently, an analyst can tease The Steelman free in the feed
while gating the full exchange inside the report.

Neither Devil's Advocate nor The Steelman feeds the record.

**Parked, September 2026.** The system that is meant to supply the objection, reading the thesis
and generating a real counter-case, is not finished, and a Steelman surface without it is an
empty box with a grand label. The card is therefore not offered in Compose's card library and
does not appear among the formats a creator can make. Nothing was deleted: the card kind, its
schema, its editor and its Feed rendering all remain, so any publication that already carries a
Steelman card renders exactly as before, and the surface returns the day the analysis works.

## Retired: the Track Record Engine

Until 2026-09-24 every call locked an entry price at publish, was graded against the market at
its horizon, and fed a private 0 to 100 Track Score. The engine, the nightly grade job, the score,
the seals, the track record page, the Verdict type and the scoring formula are all deleted. The
graded data is retired by migration 0067 (scores cleared, `predictions` frozen read-only) and the
table is dropped in a later release. Nothing replaces it.
