# Changelog

What changed on the Stoa site, newest first. One entry per merged batch.

Each entry says what a visitor would notice and what needs Krisi's attention —
schema he has to add, decisions waiting on him, or things deliberately left
unfixed. This is a log, not documentation: for the product model see
`docs/PRODUCT_MODEL.md`, for design tokens `docs/FRONTEND.md`, and for the
backend handoff `docs/BACKEND_BRIEF.md`.

---

## 2026-08-21 — Live-audit fixes: the signed-out crash on Today and Markets, the Markets placeholders, report headlines, and honest demo data

**For someone using the site**

- `/home` (Today) no longer breaks for signed-out visitors. It was showing an
  error page instead of the front page, and "Try again" could not recover it.
  `/markets/NVDA` and every other ticker page failed roughly half the time with
  the same fault; that is fixed too.
- The error page keeps the site chrome. It used to replace the whole page with
  bare centred text — no logo, no nav, no footer — so a visitor who landed there
  had no way into the product. It now sits inside the normal layout. Its wording
  also agrees with itself: the copy, the button and the nav all call `/discover`
  the Feed, where the copy previously said "the feed", the button said "Go to
  Discover" and the nav said "Feed".
- Markets no longer prints an engineering note to visitors, and no longer shows
  three consecutive blocks of grey dashes. The Movement band is gone (its two
  columns needed data the quote path does not carry), the twelve sector cards
  now show their real coverage counts instead of "--", and the ETF rows show a
  real day change instead of "--" and "0 PUBLICATIONS".
- Report pages always open with a headline. Roughly a fifth of publications had
  no title at all, so the page began with a chip row, a timestamp and then the
  dek — and the body was that same dek repeated, giving the reader one sentence
  twice. On the page where someone decides whether to pay.
- The demo data no longer reads as fake. Publications titled "Untitled" are
  gone, no two publications share a headline or body text, an analyst is no
  longer graded HIT and MISS on the same call days apart, the commenter called
  "Demo Investor" has a real name, no two commenters post identical text, and
  "[Demo post]" no longer appears anywhere.

**Needs Krisi**

- **The root cause is a trap that will recur.** `cachedPage()` wraps a builder
  in Next's `unstable_cache`. Anything inside that scope that reads `cookies()`
  throws — and the cookie-bound Supabase client reads cookies to construct
  itself. Two builders did that. Both cache entries are shared across all
  visitors, so they had no business reading one reader's session anyway. Rule
  for new code: inside `cachedPage`, use `createPublicClient()` from
  `src/lib/supabase/public.ts`, never `createClient()` from
  `src/lib/supabase/server.ts`. Worth an ESLint rule or a CI check; there is a
  call-graph taint pass in the batch notes that found all of them.
- **Movement on Markets is removed, not solved.** Bringing it back needs
  per-symbol day change and average volume on the *list* quote path. Today only
  the single-symbol snapshot carries them. Same for a sector-level day change,
  which needs a constituent-weighted index we do not build.
- **The demo reseed ran against the production project** (`--allow-prod`), since
  there is no dev or staging Supabase configured. Old demo content was archived,
  not deleted, so the rows are still there and hidden by RLS. A real dev project
  would make this safe to iterate on.
- Two more engineering-voice notes are still rendering as body copy on
  `/markets/sector/[sector]` ("the content model has no per-report theme field
  yet", "Nothing is drawn until a series exists"). Left alone this batch because
  they are on a different route; they should get the same treatment.
- Still open from before: `formula_version` columns on `profiles` and
  `moat_score_snapshots`, and the unresolved Track Score formula (docs describe
  a modified Elo, the shipped engine computes a Wilson composite).

---

## 2026-08-21 — Demo content is archived rather than deleted, and the content badge is earned

**For someone using the site** Publication lists separate live work from
archived work. A publication's content badge (`VIDEO · CALL · CARDS`) is now
built only from what is actually stored, rather than asserted.

**Needs Krisi** `purge_demo_author` cannot delete a locked report, so the reseed
archives instead. Archiving hides rows from readers via RLS — it does not remove
them. A real purge needs that migration.

---

## 2026-08-20 — Demo dataset: 40 analysts with publications, calls, cards and comments

**For someone using the site** The site has a populated body of research:
analysts with track records, resolved and open calls, evidence-card stacks,
comment threads, followers and paying subscribers. Markets charts also got
readable axes, so a price can actually be read off the plot.

**Needs Krisi** Every demo account is `@stoa.demo`, which is the scope
`npm run demo:teardown` keys off. No video yet, so the Feed relies on the later
video pass.

---

## 2026-08-20 — Backend brief items 1–6, plus scale and performance hardening

**For someone using the site** Pages render markedly faster, especially the
second visitor to Markets or Today. Evidence cards, instrument follows,
threaded discussions with likes, and publication tagging all went live.

**Needs Krisi** This is the batch that implements `docs/BACKEND_BRIEF.md`; see
`docs/BACKEND_BRIEF_STATUS.md` for what is done versus outstanding. Per-card
paywalling is enforced in RLS (migration 0051), not in the query, so any new
read path inherits it. Engagement events are insert-only and partitioned.

---

## 2026-08-18 — Feed completion, and the Compose fork with the video editor

**For someone using the site** `/discover` is the video Feed and is on by
default: a vertical stream with evidence cards, provenance inks, sealed cards,
the Steelman, stage markers and real discussions. Compose starts with a single
choice, video or written, and shows what each path reaches; the video rung has
thumbnail creation and a two-track overlay editor.

**Needs Krisi** Video storage is intended as built; the open gap is burn-in.

---

## 2026-08-18 — The landing page, and marketing copy rewritten around the record

**For someone using the site** A new public landing page: the doors, a glimpse
of Today, and verdicts beside the wall of faces. All marketing copy now argues
from the permanent record rather than from a rating.

**Needs Krisi** Nothing outstanding.

---

## 2026-08-18 — Today rebuilt as the daily newspaper, Explore added, Markets given a live tape

**For someone using the site** `/home` is Stoa's daily briefing — a lead,
what is trending, and the calls the market just graded. `/explore` is a wall of
faces that hands off to the Feed player. Markets gained a running tape, theme
momentum and theme pages, live day change and Yahoo news.

**Needs Krisi** Until engagement events accumulate, the lifecycle stages that
drive placement fall back to attention-per-day since arrival rather than a
windowed velocity. Thresholds are named constants in
`src/lib/lifecycle/stages.ts`.

---

## 2026-08-18 — The profile restructured into three tiers of the analyst's work

**For someone using the site** The analyst profile replaced its tab strip with
three tiers of work. The private area merged the investor sections (library,
subscriptions, following) and the creator sections (publications, track record,
audience, earnings, storefront) into one place, and the role switcher is gone.

**Needs Krisi** Nothing outstanding.

---

## 2026-08-18 — Public performance scoring and aggregated stance removed

**For someone using the site** No score, rating, rank, percentile or
leaderboard appears anywhere public, and no surface aggregates analysts into a
verdict — no long/short splits, average targets or consensus. Analysts appear as
an avatar and a name. Graded outcomes are still public, permanent and attached
to every call. Placement is driven by the lifecycle model, not by score.

**Needs Krisi** The engine still computes a private Track Score that only the
analyst sees. It must be settled before it is ever shown publicly again, and the
formula is unresolved — see `docs/PRODUCT_MODEL.md`, "the scoring formula is
unresolved".

---

## 2026-08-16 — Markets rebuilt as an editorial surface

**For someone using the site** Markets became a browsable editorial surface
rather than a screener: Explore bands, a stock page, sector pages, ETF pages,
an instrument sheet and full chart timeframes.

**Needs Krisi** Nothing outstanding.

---

## 2026-08-16 — Global nav rebuilt, and a platform-wide design-token audit

**For someone using the site** Consistent nav proportions, spacing and type
across every page. Ad-hoc per-page colours and arbitrary spacing values were
replaced by the token scale, and the paper background was warmed so it reads as
aged ledger rather than grey-green.

**Needs Krisi** `docs/FRONTEND.md` is the source of truth for tokens. Two
neutrals (`--surface`, `--surface-2`) are not derived from `--paper` and must be
moved by hand whenever it changes.
