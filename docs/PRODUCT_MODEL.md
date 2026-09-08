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
their private track record only. Feed and Explore order comes from the engagement ranker below,
not from that score. Lifecycle stages still mark NEW / TRENDING and still help Today choose
what to lead with.

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
- **Compose** — the authoring workspace where analysts build a publication: the video, the
  research, the cards, and the call.
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

## Feed and Explore ranking

Feed and Explore share one ranker (`src/lib/ranking/`). They score the same published, ready
clips, then apply different weights because the jobs differ: Feed is "surprise me, keep
watching"; Explore is "find someone new." Weights live in `src/lib/ranking/weights.ts` and
sum to 1 per surface.

Neither surface sorts by newest, by Track Score, or by a public rating. MOAT (the private
Track Score) is a 3 to 4 percent bump, not the sort key.

**Pipeline, both surfaces**

1. Take a pool of about 120 newest published ready clips (larger than the 30 the reader will
   see, so scoring is not stuck on whatever published last).
2. Drop anything the viewer dismissed, and anything missing a report or author.
3. Score with that surface's weights. Almost every term is a **rate**, Bayesian-smoothed so a
   3-view clip with 3 likes cannot beat a 200-view clip with 40 likes. Recency fades over about
   a week. A resolved MISS on this call multiplies the whole score by 0.85; NEAR / PARTIAL by
   0.95.
4. Keep **one clip per video file** (the highest-scoring copy). Identity is the playback URL
   without query strings. Distinct Bunny guids and report ids can still point at the same MP4;
   those do not count as different videos.
5. Cap one analyst at 2 in a row and 4 in any 12, so a high-volume poster cannot flood the
   session.
6. Feed shows the top 30 in the vertical reader. Explore takes up to 30 for the wall. Tile
   **size** on Explore is rank position (first 2 large, next 4 medium, the rest standard).
   TRENDING is a badge on those large tiles when they have velocity; it does not re-sort the
   wall.

If an Explore tile opens Feed with `?at=<report id>` and uniqueness had kept a sibling that
plays the same file, Feed pins the tapped publication and drops the duplicate file.

**Feed weights:** completion 18%, likes 16%, comments 14%, click-through 14%, watchlist 12%,
recency 10%, saves 5%, shares 5%, sector 3%, MOAT 3%. Feed does not boost or bury people you
already follow. Completion is finished-plays over plays, not seconds watched.

**Explore weights:** follow-proxy 16%, likes 16%, comments 16%, velocity 14%, topic match 12%,
click-through 10%, recency 8%, MOAT 4%, saves 4%. Follow-proxy asks "would this viewer follow
this analyst?" and **downranks already-followed analysts**. Velocity is likes plus 2× comments
per day since publish.

Saves and shares are in the formula but currently always passed as 0; they are not filled from
data yet. Signed-out visitors never hit this ranker on Feed (redirect to sign-in). Explore
still ranks for everyone, with an empty viewer context when signed out.

## The lifecycle model

Content and creators move through five stages: **NEW** (time on platform plus publications),
**AVERAGE** (the steady middle), **RISING** (gaining momentum), **TRENDING** (gaining fast:
velocity, not accumulated volume), **POPULAR** (established, high accumulated attention). Only
**NEW** and **TRENDING** are ever displayed as markers. The other stages are not a sort key
for Feed or Explore.

What lifecycle still does:

- **Markers** on Today, and NEW / TRENDING labels where a publication has earned them.
- **Today's** lead, secondary, and Trending Now lists (`src/lib/today/build-today-page.ts`).
- A TRENDING **badge** on Explore's large tiles when velocity is high. Size and order on that
  wall come from the ranker, not from the stage.

Thresholds live in `src/lib/lifecycle/stages.ts`. Until the stored-stage job exists, attention
per day since arrival stands in for a windowed velocity. That proxy is not the Feed order.

## Compose is a workspace, not a wizard

There is no fork asking whether the analyst is publishing with video. A publication may have
video, research, both, or neither beyond its headline and tags, and it finds that out as it is
built rather than being asked up front.

The screen is organised by one sentence: **left is what you build with, right is what you publish
as.** The left rail is the toolbox (the card deck, then the AI assistant); the centre is the
publication (headline, dek, then the video and research modules, each stating what it holds); the
right rail is the settings applied to the publication (the call, access, promote, the publish
gates). Anything added later goes on the side that sentence puts it on.

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
