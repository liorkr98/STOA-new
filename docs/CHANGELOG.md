# Changelog

What changed on the Stoa site, newest first. One entry per merged batch.

Each entry says what a visitor would notice and what needs Krisi's attention —
schema he has to add, decisions waiting on him, or things deliberately left
unfixed. This is a log, not documentation: for the product model see
`docs/PRODUCT_MODEL.md`, for design tokens `docs/FRONTEND.md`, and for the
backend handoff `docs/BACKEND_BRIEF.md`.

---

## 2026-08-23 — The Feed as designed, Discover retired, and Explore unblocked

**For someone using the site**

- **The Feed is the designed one.** Full-screen: one publication fills the
  viewport, scrolling snaps to the next, and the clip autoplays muted as it
  arrives and stops as it leaves. The clip and the publication's evidence cards
  share a single portrait stage, so moving sideways moves through the evidence:
  the analyst's face, then the case, then the unlock. Above the frame, the mono
  dateline; on the picture, ticker and direction chips, the seal when the call is
  resolved, and the analyst's identity band; beneath it, LIKE, DISCUSS, SAVE and
  SHARE with the pager at the right end. Keyboard throughout: up and down between
  publications, left and right through cards, a double right to the unlock card,
  M to mute, Space to pause.
- **Discover is gone.** Not renamed, retired. The Feed is the only video
  discovery surface and it is called Feed. The sections, the layout toggle, the
  text mosaic and the `?layout=` parameters have all gone with it. Old links
  still work: `/discover` permanently redirects to `/feed`.
- **Explore works again.** It had been showing "Nothing to explore yet" over a
  full catalogue. Tapping a tile now opens the Feed at that publication rather
  than a separate overlay player.
- **Thumbnails appear.** Every clip thumbnail on Explore, and the Feed's poster
  frame, had been rendering as a black rectangle.

**Why Explore was empty**

Two faults stacked, and both had to be true for the page to look broken.

- 111 of the 112 clips were still marked "processing", because the Bunny webhook
  that flips them to ready has never been registered. Explore only shows
  publications with a ready clip, so it had exactly one candidate.
- Explore's wall packs tiles into complete rows and discards an incomplete
  trailing row, so it ends flush. One tile cannot complete a row, so the one
  candidate was discarded too and the page rendered its empty state.

The Feed looked fine throughout because it was not showing video at all. It was
falling back to the old text mosaic, which read publications directly and never
needed a clip. That fallback was chosen by an env flag that was present but
empty, and an empty value counted as "explicitly off" rather than "unset". All
three are fixed: the clips are ready, a thin wall now renders a short row rather
than nothing, and the flag is deleted rather than corrected, because with the
mosaic gone it has nothing left to choose between.

**Also fixed**

- **Bunny thumbnails cannot go through Next's image optimiser.** The pull zone
  refuses requests with no `Referer`, and the optimiser fetches from our own
  server where there is no referring page: every request came back 403. They are
  now loaded as plain images, which the browser sends an origin with. The other
  fix is on the Bunny side, by allowing the no-referrer case, which is a
  deliberate security setting and not ours to flip.
- **The demo clips are portrait.** They were generated at 1280x720 before this
  design existed and sat letterboxed in the 9:16 stage. All 112 were regenerated
  at 1080x1920 and re-uploaded, and the previous Bunny assets were deleted first
  so the library holds one set.

**Where Discover appeared, and what happened to each**

- Routes: `(app)/discover/` and `dev/discover/` deleted; `/discover` redirects.
- Components: `components/discover/` (filter bar, report block, layout toggle)
  deleted, along with the Feed's tab bar, QuickPost composer, and the previous
  player and page wrappers that only Discover used.
- Links: the nav, the footer, the error and not-found pages, the error panel,
  Contact, Scoring, Subscriptions, the Dispatch and onboarding all pointed at
  `/discover`; all now point at `/feed`, or at `/explore` where they meant
  "browse analysts".
- Revalidation: seven `revalidatePath("/discover")` calls across the report,
  card, boost, social and publish paths now revalidate `/feed`.
- The `video_first_discover` feature flag, its helper and its env override:
  deleted.
- Boost placements `discover_researchers` and `discover_sidebar` renamed to
  `analyst_featured` and `analyst_sidebar`. Safe to rename because the `boosts`
  table has never been migrated, so no stored row carries the old values.
- Copy and comments across fourteen files, plus the sitemap entry.
- Docs: `CLAUDE.md`, `AGENTS.md`, `docs/PRODUCT_MODEL.md`, `docs/FRONTEND.md`,
  `README.md`, `docs/ROADMAP.md`, `docs/MOTION.md`, `docs/SCALE.md` and
  `docs/BACKEND.md`. CLAUDE.md and AGENTS.md are read at the start of every
  session and both said the Feed lives at `/discover`, so a stale line there
  would have kept steering work back to a surface that no longer exists.

**Needs Krisi**

- The Bunny webhook is still unregistered, so the 112 clips were promoted by
  polling again (`demo:video:check -- --promote`). Nothing has changed about
  items 16 and 17 in `docs/BACKEND_BRIEF.md`; they are still the fix.

**Left undone, deliberately**

- The QuickPost composer went with Discover. Analysts compose in Studio, which
  the nav's Write button already points at, so nothing is unreachable, but this
  did remove a one-line posting entry point rather than move it.
- The Researchers tab is gone and nothing replaced it. The two analyst boost
  packages are still priced and sold against a placement that now has no
  surface to render in.

---

## 2026-08-22 — Demo video, pass 2: a clip for every publication that should have one

**For someone using the site**

- Nothing is visibly different yet, and that is the intended stopping point.
  Explore and the Feed only show publications that carry a video clip, and the
  demo dataset had 455 publications and no video at all, so both surfaces were
  empty. There are now 112 clips generated and uploaded, one each for the three
  most recent publications of all 40 demo analysts. They sit in Bunny's
  "processing" state until the webhook is registered, so the surfaces stay empty
  until then; see below.
- The clips are honest placeholders, not pretend footage. Each one is the
  analyst's own placeholder thumbnail held for 30 to 85 seconds: their assigned
  colour, the same soft two-tone wash, the same abstract circle-and-shoulders
  figure at 20% opacity, with a slow drift of light across it so it reads as
  video rather than a frozen frame. No text, no initials, no stock footage of
  real people. At tile size it reads as a person on camera; at full size it is
  obviously synthetic, which is what a demo dataset should look like.
- An analyst is the same colour everywhere. The clips reuse `analystColor()`,
  the same id-seeded assignment the placeholder thumbnails already use, so an
  analyst's clip matches their placeholder on every surface.

**What was added**

- `npm run demo:video:generate` renders the clips into `demo-clips/`, which is
  gitignored, because 122 MB of mp4 has no business in the repo. Files are named for
  their report id so the upload step matches clip to publication by name rather
  than by guessing, and a manifest records the pairing.
- `npm run demo:video:upload` pushes them to Bunny and attaches a `video_clips`
  row to each publication. It resumes rather than duplicating if re-run, and
  deletes the Bunny asset again if the database row cannot be written, so a
  paid library never accumulates assets that teardown cannot see.
- `npm run demo:video:check` reports where every clip has got to on both sides,
  Bunny and the database, and is read-only unless given `--promote`.
- `npm run demo:teardown` already covers all of it: it reads the Bunny GUIDs out
  of the `video_clips` rows and deletes the assets before the rows. Confirmed
  against the real library: a dry run accounts for all 112.

**Needs Krisi**

- **Register the Bunny webhook.** Full URL, secret and the exact behaviour are
  in `docs/BACKEND_BRIEF.md` item 16. The handler was verified against the real
  library: wrong secret refused 401, right secret flips the clip to ready with
  Bunny's own CDN URLs and measured duration.
- **Registering it will not make these 112 clips ready.** Bunny fires on a
  status transition, and all 112 finished transcoding before any webhook existed
  to hear it. There is no pending delivery and Bunny does not replay. The
  registration covers future uploads; this batch needs one
  `npm run demo:video:check -- --promote` sweep, which is written and unrun.
- **This is not only a demo problem, and it is worse on the real path.** A
  creator whose upload finishes but whose webhook never lands cannot publish at
  all: the publish route refuses on `status !== 'ready'`, and captions are only
  ever requested by the webhook, so the "captions are still generating" gate
  never clears either. The clip sits in processing forever, nothing retries and
  nothing alerts. Item 17 asks Krisi to confirm the URL is genuinely saved and
  enabled in Bunny rather than just entered, and proposes a polling reconciler
  on the existing cron surface so a stuck clip heals itself.
- **The webhook never sets `published_at`.** It sets `status` and nothing else,
  while every discovery query filters on `status = 'ready' AND published_at IS
  NOT NULL`. The seeder sets it at insert so the demo does not need a second
  pass, but for real creator uploads the publish step is load-bearing and easy
  to miss. Item 16 has the detail.

**Found in passing, not fixed**

- Explore draws nothing at all below three ready clips. The wall packs into rows
  of six or three with `complete: true` and drops any incomplete trailing row,
  so one or two ready clips render as "Nothing to explore yet for this filter."
  Correct for a full wall, confusing while a dataset is filling up. Worth a
  short-row fallback if the empty state is ever reachable in production.
- `node_modules` on this machine was a full Next 15 install while `package.json`
  and the lockfile both specify Next 16, which broke `npm run lint` outright
  (`eslint-config-next/core-web-vitals` cannot resolve). `npm install` fixes it
  and left the lockfile untouched, so this was a stale local install rather than
  anything in the repo. Worth knowing because a dev server started before that
  install keeps running against the deleted modules and 500s on every route.

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
- Nothing on the site now explains its own implementation to the reader. Four
  pieces of copy did; the sector Performance band that existed only to carry one
  is gone, and the sector header no longer reserves an empty price slot.
- The demo data no longer reads as fake. Reseeded to 455 publications across 40
  analysts: no publication is untitled, no two share a headline or body text, no
  analyst is graded HIT and MISS on the same name, nobody is called "Demo
  Investor", no two commenters post identical text across 1,132 comments, and
  "[Demo post]" is gone. Every publication labelled CALL now actually carries a
  locked call (224 of 224), which was not true before.

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
- **One publication on Bar's own account** (`@barams2023`, published 18 Aug) has
  an empty title and an empty body, so Today lists it as "Untitled research". It
  is real account data, not demo data, so it was left alone -- it needs a
  decision, not a fix.
- The Performance band on `/markets/sector/[sector]` is removed, not solved. A
  sector-level index needs a history of constituent prices, which the quote path
  does not carry. The sector day change shown in the header is real: the
  equal-weight average of the listed names.
- Two caveats were kept but rewritten out of engineering voice, and both still
  describe real gaps: Inbox notification preferences do not persist, and Compose
  overlays are previewed but not burned into the published video.
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
