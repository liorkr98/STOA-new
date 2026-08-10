# Stoa — Product Model

The current product model in one place. This is the reference for what Stoa is and how its
pieces fit together. For visual tokens see `docs/FRONTEND.md`; for agent working rules see
`AGENTS.md`.

## What Stoa is

Stoa is a marketplace where independent financial analysts publish stock research and market
commentary, and retail investors pay for it. The platform takes 10%.

The core differentiator is the **Track Record Engine**: every call is logged at publication with
its entry price locked and attested, then graded by the market at resolution. Graded call
outcomes move the analyst's **Track Score**, shown out of 100. Track records are public,
permanent, and non-transferable. That is the moat.

## The content model (video-first)

The atomic unit of a publication is a short analyst **video**. Everything else is optional
enrichment layered on top of the video:

- **Call** — a locked prediction: ticker, direction, target price, horizon. Locked and attested
  at publish, then immutable. The only element that feeds the Track Score.
- **Cards** — a swipeable stack of evidence (see The Card Engine).
- **Thesis** — the full written argument.

So a publication can be a locked call with a full thesis and a deep card stack, or it can be
video-only commentary with no call at all (e.g. "what the Iran escalation means for crude").

**Only publications carrying a locked call are ever scored.** Commentary is never graded.

### Type labels

Every publication is one of three types:

- **CALL** — built around a locked call.
- **RESEARCH** — a full written thesis; may or may not carry a call.
- **NOTE** — short commentary, no call.

### Content badge and anchoring

Every publication carries a **content badge** stating what it contains, for example
`VIDEO · CALL · CARDS` or `VIDEO · NOTE`. The badge tells a reader up front what they are getting.

- Publications **with a call** show **ticker + direction chips** (e.g. `NVDA` + `LONG`).
- Publications **without a call** anchor on a **theme / sector tag** instead
  (e.g. `MACRO · OIL & ENERGY`, `SEMIS`).

## The surfaces

Stoa is organized around five surfaces.

- **Feed** — video-first discovery. A vertical stream of publications you swipe through.
- **Today** — the daily editorial read. A curated, newspaper-style briefing of what matters now.
- **Markets** — instrument exploration: stocks, ETFs, and sectors, and the Stoa coverage on each.
- **Compose** — the authoring studio where analysts record the video and assemble the call,
  cards, and thesis.
- **Profile** — the public analyst storefront, plus one private area that covers both the
  investor sections (library, subscriptions, following) and the creator sections (publications,
  track record, audience, earnings, storefront).

> **Open decision — Feed vs Discover.** **Discover** is a real, already-designed surface and a
> live route (`/discover`). Feed and Discover compete for the same discovery nav slot, and which
> one wins is not yet decided. Both exist today; this document does not resolve the choice.

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

Two linked features that pressure-test conviction. Neither ever touches the Track Score.

### Devil's Advocate (a paid conviction tool in Compose)

Available only on the written-thesis rung. It reads the analyst's thesis and lists **three
counterpoint headlines** as locked teasers. The analyst spends credits to unlock one, which
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

Neither Devil's Advocate nor The Steelman feeds the Track Score.

## The Track Score

The Track Score is an analyst's reputation, and it is the moat.

- Every call locks an entry price at publish, server-side, and attests it.
- When the call's horizon ends, the market grades the outcome against that locked entry.
- Graded call outcomes move the analyst's Track Score.
- The score is displayed as a single number, 0 to 100.
- It is **public** (anyone can see it), **permanent** (nothing is quietly erased), and
  **non-transferable** (it belongs to the record, not the account).

Only calls move the Track Score. Video commentary, notes, cards, polls, and any community
sentiment never touch it.

### Open decision: the scoring formula is unresolved

How a graded outcome translates into the number is **not settled**, and this document does not
pick a winner:

- The **docs describe a modified Elo** (a 600-1400 style rating).
- The **shipped engine** (`src/lib/engine/score.ts`) computes a **Wilson win-rate / profit-factor
  / alpha composite**.

These are two different formulas. Reconciling them is open work and needs a decision with Krisi.
Until then, treat the 0-100 display as settled and the underlying formula as undecided.
