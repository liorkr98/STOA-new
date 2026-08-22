# Stoa — Product Model

The current product model in one place. This is the reference for what Stoa is and how its
pieces fit together. For visual tokens see `docs/FRONTEND.md`; for agent working rules see
`AGENTS.md`.

## What Stoa is

Stoa is a marketplace where independent financial analysts publish stock research and market
commentary, and retail investors pay for it. The platform takes 10%.

The core differentiator is the **Track Record Engine**: every call is logged at publication with
its entry price locked and attested, then graded by the market at resolution. Every graded
outcome (HIT / MISS / NEAR, entry to exit, return, alpha) is public, permanent and
non-transferable, and stays visible wherever the call appears. That record is the moat.

**There is no public scoring.** No score, rating, rank, percentile or leaderboard appears
anywhere public, and no surface ever aggregates analysts into a verdict (no long/short splits,
average targets or consensus). Analysts appear as an avatar and a name; the one exception is the
public profile's audience line (`4.3K FOLLOWERS · 214 MEMBERS`, members opt-in). The engine still
computes a private Track Score and records still accrue; the analyst sees their own number in
their private track record only. Placement across the product is driven by the lifecycle model
below, not by score.

## The content model (video-first)

The atomic unit of a publication is a short analyst **video**. Everything else is optional
enrichment layered on top of the video:

- **Call** — a locked prediction: ticker, direction, target price, horizon. Locked and attested
  at publish, then immutable. The only element the market grades.
- **Cards** — a swipeable stack of evidence (see The Card Engine).
- **Thesis** — the full written argument.

So a publication can be a locked call with a full thesis and a deep card stack, or it can be
video-only commentary with no call at all (e.g. "what the Iran escalation means for crude").

**Only publications carrying a locked call are ever graded.** Commentary is never graded.

### Anchoring rule

Items **with** a call show a ticker chip and a direction chip, and a HIT / MISS / NEAR seal once
resolved. Items **without** a call show no ticker, no direction chip and no seal; they anchor on
a theme or sector tag instead (`MACRO · OIL & ENERGY`, `SEMIS`). Every item on every surface
carries a **content badge** stating exactly what it contains (`VIDEO`, `VIDEO · CALL`,
`VIDEO · CALL · CARDS · THESIS`), built only from what is stored.

### Type labels

Every publication is one of three types:

- **CALL** — built around a locked call.
- **RESEARCH** — a full written thesis; may or may not carry a call.
- **NOTE** — short commentary, no call.

## The surfaces

Stoa is organized around five surfaces.

- **Feed** — video-first discovery, and the only one. A full-screen vertical stream: one
  publication fills the viewport, scrolling snaps to the next, the clip autoplays muted as it
  arrives and stops as it leaves. Sideways moves through that publication's evidence cards.
- **Today** — the daily editorial read. A curated, newspaper-style briefing of what matters now.
- **Markets** — instrument exploration: stocks, ETFs, and sectors, and the Stoa coverage on each.
- **Compose** — the authoring studio where analysts record the video and assemble the call,
  cards, and thesis.
- **Profile** — the public analyst storefront, plus one private area that covers both the
  investor sections (library, subscriptions, following) and the creator sections (publications,
  track record, audience, earnings, storefront).

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

Neither Devil's Advocate nor The Steelman feeds the record.

## The Track Record Engine and the (private) Track Score

The record is an analyst's reputation, and it is the moat.

- Every call locks an entry price at publish, server-side, and attests it.
- When the call's horizon ends, the market grades the outcome against that locked entry.
- Every graded outcome is **public** (seal, entry to exit, return, alpha), **permanent** (nothing
  is quietly erased) and **non-transferable** (it belongs to the record, not the account).
- The engine also computes a 0 to 100 **Track Score** from graded outcomes. It is **not shown
  publicly**; the analyst sees it in their private track record. It must be settled (below) before
  it is ever shown again.

Only calls move the record. Video commentary, notes, cards, polls, and any community sentiment
never touch it.

### Open decision: the scoring formula is unresolved

How a graded outcome translates into the number is **not settled**, and this document does not
pick a winner:

- The **docs describe a modified Elo** (a 600-1400 style rating).
- The **shipped engine** (`src/lib/engine/score.ts`) computes a **Wilson win-rate / profit-factor
  / alpha composite**.

These are two different formulas. Reconciling them is open work and needs a decision with Krisi.
Until then, the score stays private and the underlying formula undecided.

### Swapping the formula

The scoring math is isolated so a different formula (for example the modified Elo above) can be
dropped in later without touching the rest of the app.

**Where it lives.** All scoring math is in one file: `src/lib/engine/scoring/formula.ts`. Nothing
else in the app does scoring arithmetic of its own. (`src/lib/engine/score.ts` re-exports the
formula and adds the separate grading step and tier labels; `src/lib/dispatch/ranking.ts` computes
a distinct editorial ranking that *reads* an analyst's Track Score but is not the Track Score.)

**What the formula receives.** An array of resolved calls (`ScoringCall`), each carrying only the
facts the score is derived from: direction, locked entry price, resolved (exit) price, the
benchmark return over the same window, the graded outcome, and the resolution date. It may also
receive the platform-wide alpha distribution used to rank one analyst against all others.

**What the formula must return.** A `ScoreResult`: the 0-100 `score`, its component `breakdown`
(win rate, profit factor, alpha, consistency), the supporting numbers, and the `formulaVersion`
that produced it.

**How to swap it.**
1. Change `computeScore` in `formula.ts`, keeping the same input and output contract.
2. Bump `FORMULA_VERSION`.
3. Recompute all scores together (below).

**Recompute rule: all analysts move together.** A score is only meaningful relative to other
scores, so when the formula changes every analyst is recomputed in one pass, never a mix of old
and new versions. Run:

```bash
npm run recompute:scores              # dry run: prints every analyst's old -> new score
npm run recompute:scores -- --commit  # rewrite profiles + insert fresh snapshots
```

It requires `SUPABASE_SERVICE_ROLE_KEY`, reads each analyst's stored call history, and rewrites
their score and components from it using one shared alpha distribution.

**Stored inputs, and what's missing.** Every fact the formula needs is already persisted per call
on `predictions`: entry price (`lock_price`), exit price (`resolved_price`), target
(`target_price`), direction, horizon (`resolves_at` / `target_horizon_date`), actual return
(`return_pct`), and benchmark return (`benchmark_pct`). Per-call alpha is not stored but is
derivable (`return_pct - benchmark_pct`). Two things are NOT yet stored and need a schema change
(for Krisi): a `formula_version` column on `profiles` and on `moat_score_snapshots`, so every
stored score is traceable to the formula that produced it. Until those columns exist, the
recompute path carries the version in code and logs it but cannot persist it.
