# Stoa — Backend brief

For Krisi. Written at the end of the frontend build run of August 2026 (see `docs/BUILD_SPEC.md`
for what was built). Every item below is something the frontend now renders as a placeholder,
holds in memory, or derives from a proxy, and needs the backend to become real. The frontend
never touched the schema, money or pricing, or existing data; where it needed a column it did not
add one, it collected the need here.

Structure: the four cross-cutting concerns first (they apply to every item), then the gap list in
priority order with, per item, what the frontend does today, what it needs, and how each concern
applies. Corrections to assumptions in the build spec are called out inline; three matter:

- **Video storage exists and is intended.** `video_clips` (migration 0042: `bunny_video_guid`,
  `playback_url`, `thumbnail_url`, `preview_url`, `caption_vtt_url`, `transcript`,
  `duration_seconds`, `status processing|ready|failed`, `published_at`) plus `video_view_events`
  (`watched_seconds`), on Bunny Stream via TUS upload and a ready webhook, is the deliberate video
  layer for the publication's clip. The frontend reads it for the profile shelves, Today, Explore
  and the Feed. The remaining gap is **not** the video entity: it is the overlay burn-in pipeline
  plus persistence of overlays and the chosen thumbnail (item 1).
- **`video_assets` is a second, parallel video system, not a stray.** It is written by the report
  editor's inline video block (`video-node-view.tsx` → `/api/video/upload`, `/api/video/token`,
  the Cloudflare Stream webhook; `provider` defaults to `cloudflare`, columns `playback_id`,
  `poster_url`, `duration_s`, `aspect_ratio`, `transcript jsonb`, `chapters jsonb`, `status`).
  There is no schema conflict with `video_clips` (no shared keys; `video_view_events` references
  `video_clips` only; RLS is separate). The conflict is conceptual: two providers, two tables, two
  meanings of "video". A report whose only video is an inline Cloudflare asset reads as a *written*
  publication on every video-first surface (profile tiers, Today, Explore, Feed, Studio list),
  because those read `video_clips`. Flagged, not changed; decide whether the inline block should
  keep its own provider, migrate to Bunny, or be retired.
- **Day change is fixed on the frontend side.** Yahoo's batch quote already returns
  `regularMarketChangePercent` and `regularMarketPreviousClose`; the provider mapper was dropping
  them. `Quote` now carries `changePercent` / `previousClose` (nullable), and lists, the tape,
  sector names and Today's ticker rows show real values. Nothing needed from the backend here.
- **No tag model exists.** The spec said "keep the current model exactly"; there is none.
  `reports` has no tag columns (the only `tags text[]` is on `notebook_entries`). The picker
  ships against a data-driven taxonomy in `src/lib/tags/taxonomy.ts`; nothing persists.

---

## The four cross-cutting concerns

Apply each of these to every item in the gap list; where an item has a specific note it is under
the item.

### 1. Scalability

- **Query shape.** The frontend's list builders (`src/lib/today/build-today-page.ts`,
  `src/lib/markets/build-explore.ts`, `src/lib/landing/build-landing.ts`, `src/lib/explore`)
  each pull one bounded pool per request (80 to 120 newest publications, 40 analysts, 24 resolved
  calls, 120 clips) and derive lists in memory. This is fine at 1× and holds to roughly 10× rows,
  but every request re-derives trending/popular from the pool. Past that, the lifecycle stages
  and the trending/popular lists should be materialised (item 5) and read, not computed.
- **N+1 risks that exist today.** `listCommentsForReports` batches; the Studio publications
  list batches clips; `buildToday` (legacy) did per-symbol counts. New per-row calls to avoid:
  sector lookups per ticker (already batched via `listTickerRows`), quotes per symbol (batched via
  `getQuotesBatch`), any per-publication cards fetch once cards exist (item 4 should be one query
  keyed by publication ids).
- **Pagination.** Today, Explore, the Feed and Markets rows are all first-page-only. Explore's
  wall is capped at `EXPLORE.TARGET_TILES` (30) by design; the Feed page should page by
  `published_at` cursor (not offset) once the player supports loading more; the profile's
  Everything grid loads the whole author list (fine until an analyst passes a few hundred
  publications).
- **Indexes to confirm.** `reports (status, published_at desc)`, `reports (author_id,
  published_at desc)`, `reports (ticker) where status in (published, resolution_pending_review)`,
  `predictions (outcome, resolves_at desc)`, `video_clips (creator_id, status, published_at)`,
  `comments (report_id, created_at desc)`. `video_clips_feed_idx` already exists.
- **What breaks at 10× volume.** The in-memory lifecycle computation over a 120-row pool stops
  being representative (the population median drifts); the coverage counts (`tickerCoverage`,
  `coverageCounts` with `limit(2000)`) silently truncate; the Explore wall's ranking degrades to
  "newest 90". Item 5 and item 6 fix all three.

### 2. Caching

- **What is cached and for how long today.** Market data only, in-process: quotes 15s, intraday
  60s, daily bars 1h, fundamentals 24h, Yahoo news 10 min (`src/lib/market/cache.ts`,
  `src/lib/market/yahoo-news.ts`). Everything database-backed is fetched per request; the app
  layout is `force-dynamic`. The news API route sets `s-maxage=300, stale-while-revalidate=600`.
- **What may be cached, and what must not.** Trending/popular lists, theme momentum, sector and
  theme pages, the tape and Explore rows can be cached for 30 to 120s per key. **Anything
  touching a locked call, a resolved outcome, or a score must never serve stale:** the Verdicts
  band (Today, landing), seals on any tile, entry to exit and return, the call block on a report,
  the analyst's private track record. If Today is cached as a whole, split it so the Verdicts
  fragment is fetched fresh or invalidated by the grading job.
- **Invalidation triggers.** Publish (reports.status to published) invalidates: the author's
  profile tiers, Today's pool, Explore, the Feed, theme/sector counts. Grading (predictions
  resolved) invalidates: Verdicts everywhere, the report page, the analyst's private record, the
  landing. Follow/subscribe invalidates only the reader's own Today sidebar and desk. Clip ready
  (Bunny webhook) invalidates: the report page, the author's profile lead, Explore.
- **Reader-side.** The Your Tickers list is browser-local (item 2) and re-resolves prices on
  every mount; once follows are server-side it joins the reader-scoped fetch.

### 3. Rendering

- **Server vs client.** All list surfaces are server components fed by server-only builders;
  the interactive shells (Rail arrows, the Today sidebar drawer, the Explore wall, the Feed player,
  the video rung, the tag picker) are client components receiving plain data. Nothing
  provider-side (Bunny env, Yahoo) reaches the browser: embed URLs are built server-side in
  `src/lib/feed/build-publications.ts` and `src/lib/video/card.ts`.
- **SEO.** `/home` no longer redirects signed-out readers; the Verdicts rail is server-rendered
  in the HTML and is the shareable, indexable surface. `/markets`, sector, theme and ETF pages and
  the landing are fully server-rendered. The Feed player and Explore overlay are client-only
  above server-rendered data.
- **Streaming boundaries.** The root `loading.tsx` wraps every route; Today and the landing await
  Yahoo (tape, news) before first byte, which under a slow provider delays the whole page. Two
  options: move the tape/news into their own Suspense boundaries with a reserved-height fallback,
  or serve them from the cache layer above with a stale value. Prefer the first for the tape.
- **Gated content is never sent to the browser.** The Feed player receives per-card `locked`
  flags and renders sealed cards from *card metadata only*; once cards are stored (item 4), the
  API must omit locked card bodies for non-entitled readers, not just flag them. Same rule the
  report page already follows for `report_bodies` (RLS-gated). Confirm the per-card entitlement
  is enforced server-side, since the creator sets the reveal line per card, not per report.

### 4. Regionality

- **Video.** Bunny Stream serves from its CDN; confirm the storage zone/replication covers Israel
  and the US (Bunny's default pull zone is global; the *storage* region is chosen per library),
  and that thumbnails/previews are served from the same edge. Adaptive bitrate is Bunny's; the
  overlay burn-in job (item 1) must run near the storage region to avoid pulling every source
  across regions.
- **Database and edge.** Supabase project region is single; Vercel functions default to
  `iad1`. For Israeli readers every dynamic page pays a US round trip; consider Vercel edge or a
  regional function for the read-heavy public pages (Today, Verdicts, Markets) once caching
  exists, and keep writes central.
- **Market data.** Yahoo is called from the server region; TA-35 (`TA35.TA`) resolves. Data
  residency: no personal data leaves Supabase; the only third parties receiving user-derived data
  are Bunny (uploads) and PayPal.

---

## The gap list, in priority order

### 1. Video: overlay burn-in and persistence (the entity itself is done)

**Today.** `video_clips` on Bunny is the intended video store and works end to end (upload,
processing, ready webhook, captions, transcript). The Compose video rung
(`src/components/compose/video-rung.tsx`) lets a creator pick a local file, extract a thumbnail
frame or upload one, trim, and place text and visual overlays on two tracks with a faithful
preview. All of it is held in memory: nothing stores the edit, and publishing with overlays is not
wired. The processing state UI (`src/components/compose/processing-state.tsx`) and the Studio
list read the clip's real `status`.

**Needed.**
- **Overlay storage.** A `video_edits` (or `video_clip_edits`) row per clip: `trim_start`,
  `trim_end`, `thumbnail` (`{type: frame, time}` or `{type: upload, url}`), `overlays jsonb`
  (the `Overlay[]` shape in `src/lib/compose/overlays.ts`: text with position 1..9 and size, or
  visual with source, mode cutaway|inset, position, and start/end seconds).
- **DECISION REQUIRED, the burn-in pipeline.** Overlays burn permanently into the video at
  publish, which means server-side compositing. Options: (a) a worker (ffmpeg with drawtext /
  overlay filters, or Remotion) pulling the source from Bunny, compositing, and re-uploading a
  new Bunny video; (b) Bunny's own overlay support is limited to a static watermark, so it does
  not cover timed cutaways; (c) skip burn-in and render overlays client-side in the player from
  the stored JSON (cheapest, not permanent, contradicts the spec's "permanent" rule but is
  reversible). Cost model for (a): a queue (Supabase pg_cron plus an Edge Function is too weak for
  ffmpeg; a small always-on worker or a job service is needed), roughly real-time-to-2× on a
  90-second clip, plus a second Bunny video per publish. The publish flow becomes: create report,
  create clip (processing), enqueue burn-in, on completion mark ready. The processing-state panel
  already reads `status`; add a `stage` (transcoding|compositing|captions|ready) if you want the
  step list to be exact rather than elapsed-based.
- **Thumbnail from a chosen frame.** Bunny can set the thumbnail at a timestamp
  (`thumbnailTime`); the upload path is a storage put plus `thumbnail_url` update.
- **View metrics readable by readers.** `video_view_events` is RLS-scoped to the creator, so
  "most watched" uses `reports.views`. Either an aggregate column (`video_clips.view_count`,
  `watch_seconds_total`) maintained by trigger, or a public materialised count.
- **`video_assets` / Cloudflare.** See the correction at the top: a parallel system for inline
  report videos. Decide its future; if it stays, video-first surfaces should either ignore it
  (today's behaviour) or count it as "has video" with a poster from `poster_url`.
- Scalability: one clip per publication is assumed everywhere (`clipByReport` maps); if a
  publication can have several, add `is_primary`. Caching: clip ready invalidates profile/Explore.
  Rendering: embed URLs stay server-built. Regionality: burn-in near storage.

### 2. Instrument, ETF and sector follows

**Today.** Analyst follows are server-side (`follows`). Ticker and sector follows are
browser-local (`localStorage` keys `stoa-watchlist`, `stoa-sector-watchlist`; `src/lib/watchlist.ts`),
so Your Tickers on Today re-resolves from the client and no ETF/sector follow survives a device
change.

Today's sidebar tops up short personal lists with suggestions that carry a small Follow control:
creator follows go to `follows` through `toggleFollow` (server-side, real); ticker follows write
the browser-local watchlist, so they do not survive a device change and the server never sees them.

**Needed.** A `follows_instruments` table (`owner_id`, `kind: ticker|etf|sector|theme`,
`symbol text`, `created_at`, PK owner+kind+symbol) with RLS owner-only, plus a one-time import
endpoint the client can call to migrate its local list. This underpins Today's Your Tickers,
Markets' Follow controls, and the engagement algorithm's affinity term. Caching: reader-scoped
only. Rendering: keep the client fallback until the table exists, then drop it.

### 3. Publication metadata

**Today.** Content badges are built from what is stored (clip present, prediction present,
`type = research` or a long body); "Cards" is never claimed. Callless items anchor on the ticker's
sector from `tickers.sector` (`THEME_TAG_PLACEHOLDER` in code). Tags exist only in the picker.

**Needed.**
- `reports.primary_tag text`, `reports.secondary_tags text[]` (max 2), validated against the
  taxonomy (or a `tags` table the taxonomy moves into). Auto-fill from the call's sector stays a
  frontend concern.
- `reports.theme_tag text` for callless items (or derive from `primary_tag`).
- `reports.content_flags` (or derive `has_video`, `has_call`, `has_thesis`, `has_cards` at read
  time) so the badge is authoritative and cheap.
- `reports.scheduled_for timestamptz` for scheduling (the Studio list already has a
  `scheduled` state with nothing behind it).
- Rendering: tags are searchable-only for secondaries; add them to the search index.

### 4. Evidence cards (the Card Engine) and the Steelman

**Today.** The Feed player renders nine card formats (`src/lib/feed/types.ts`: thesis, edge,
path_to_target, kill_switch, catalyst_timeline, checklist, figure, steelman, unlock) with
three-ink provenance and per-card `locked`. Live publications get only a case card (the deck)
and the unlock card (`CARDS_PLACEHOLDER`).

**Needed.** A `publication_cards` table (`report_id`, `position`, `kind`, `locked bool`,
`payload jsonb` matching the discriminated union, `created_at`) or a `cards jsonb` column on
reports if you prefer one row. The Steelman needs the Devil's Advocate objection and the
analyst's answer stored (`steelman_objection`, `steelman_answer`, plus independent free/locked
flags for the report-page box and the stack card, since the two placements gate independently).
Provenance (`plain|creator_est|auto`) is per value inside the payload; AUTO values should carry
a source reference. Rendering: locked payloads must be stripped server-side for non-entitled
readers (see concern 3). Caching: cards change only on publish/edit.

### 5. The lifecycle stages and engagement events

**Today.** `src/lib/lifecycle/stages.ts` computes NEW / AVERAGE / RISING / TRENDING / POPULAR
per request from a proxy: attention per day since arrival (`views + 5·likes + 10·comments`),
compared with the population median of the current pool. Constants are named and grouped
(`LIFECYCLE`, `EXPLORE`); the report of what was chosen is in the constants' comments. This drives
Explore's tile sizes, Today's lead/secondary/Trending Now, the sidebar's trending lists, and
the NEW / TRENDING markers.

**Needed.**
- **Engagement events**: a table (`actor_id nullable`, `report_id`, `kind: impression |
  play | watch_progress | swipe_depth | cta_reach | unlock | subscribe | follow_from_surface`,
  `value numeric`, `surface`, `created_at`). `video_view_events` and `report_views` cover two of
  these already.
- **Windowed velocity**: a job (pg_cron, every 10 to 15 min) that computes per-publication and
  per-creator attention over the last 48h vs the prior 14d and writes `stage`, `trending_score`,
  `attention_rate` to `reports` / `profiles` (or a `lifecycle_snapshots` table). The frontend
  then reads the stage instead of computing it; the proxy stays as fallback.
- Scalability: this is what removes the per-request in-memory ranking. Caching: the job's cadence
  is the cache. Rendering: markers are plain data.

### 6. Coverage counts and the tape

**Today.** `tickerCoverage` and `coverageCounts` scan up to 2000 report rows per request; theme
momentum (this week vs last) is two such scans. The tape is live Yahoo (indices, futures, TA-35)
plus the eight most-covered tickers.

**Needed.** A materialised `ticker_coverage` (symbol, all_time, last_7d, prior_7d, analysts,
open_calls) refreshed by the same job as item 5. Sector index level: none exists; the sector
header shows an equal-weight average of its names' day changes, labelled as such, and the
performance chart stays a structure until a sector series (or an ETF proxy per sector) is
chosen. Rendering: the tape is server-rendered; keep it out of the page's critical path (see
concern 3).

### 7. Discussions

**Today.** `comments` is flat (`report_id`, `author_id`, `body`, `likes`). The Feed discussion
renders one-level nesting and flattens deeper replies with an @mention; live replies post as
top-level comments carrying the mention (`COMMENTS_PLACEHOLDER`).

**Needed.** `comments.parent_id uuid null references comments(id)` with a check that a parent
has no parent (one level), an index on `(report_id, parent_id, created_at)`, a `comment_likes`
table (`comment_id`, `user_id`) so likes are per user rather than a counter, and an `is_author`
derivation (compare `author_id` to `reports.author_id`; the frontend does this by handle today).
`postFeedComment` in `src/app/actions/feed.ts` already accepts `parentId`.

### 8. Notification types and preferences

**Today.** `notify_report_event` emits like / comment; the app also creates follow / publication
/ subscribe / sale. All "good to know". No preferences.

**Needed.** The "needs you" kinds: `call_resolved` (for followers of the analyst and for the
analyst), `call_resolving_soon` (horizon within N days), `subscription_renewing`,
`payment_failed`, `payout_ready`. A `notification_preferences` table (or jsonb on profiles) with
per-kind email/in-app toggles. Caching: none. Rendering: the bell reads a count; keep it a single
indexed query on `(recipient_id, read_at is null)`.

### 9. Pricing consolidation (report only; do not migrate without a decision)

Two parallel systems: `plans` (rich tiers, drives tier subscriptions and report gating) and the
legacy flat `profiles.sub_price` / `profiles.report_price` (still the fallback subscribe price and
the default report unlock price, edited in two duplicate places). The `/pricing` marketing page is
hardcoded. Consolidating means deciding where the two fallbacks come from once tiers are the only
system, and reading `/pricing` from a shared constant. The frontend did not touch any of this.

### 10. The scoring formula and `formula_version`

The docs describe a modified Elo (600 to 1400); the shipped engine computes a Wilson win-rate /
profit-factor / alpha composite (`src/lib/engine/scoring/formula.ts`, versioned, with a recompute
path). Scores are no longer displayed publicly (only in the analyst's private track record), but
the engine still runs. Before a score is ever shown again: settle the formula, add
`formula_version` to `profiles` and `moat_score_snapshots`, and recompute all analysts together.

### 11. Server-side paywall, per card

Gated content must never be sent to the browser. `report_bodies` is RLS-gated; once cards exist
(item 4) the same must hold per card, and the Feed player's data path must strip locked payloads
for non-entitled readers rather than sending them flagged. Confirm entitlement (`report_unlocks`,
`subscriptions` with plan rank and perks) is checked in the query, not the component.

### 12. Smaller items

- Privacy toggle field ("show who I follow"). Storage for avatar and cover uploads. Account
  deactivation. Subscription tier names on the subscription row. A "most popular" tier flag.
  Per-publication unlocks and revenue aggregation for the Studio list (currently `—`).
  Subscriber growth time series. Boost live stats, pricing and history. Payout history records.
- `dispatch_meta.bump_dispatch_issue` is called from Today and the landing; it is idempotent
  per day, fine.
- The `updateProfileConfig` action overwrote `profile_config` with a partial object (would erase
  accent, pinned report, storefront sections); it now merges. Worth a DB-side guard if
  `profile_config` gets more owners.
- Repo lockfile: `package-lock.json` is the only lockfile and the `supabase:*` scripts shell out
  to `pnpm dlx`; confirm the lockfile is in sync with `package.json` in CI.

---

## What the frontend already reads that you should keep stable

- `video_clips` columns and statuses (`processing|ready|failed`), and the ready webhook.
- `reports` (`status in published|resolution_pending_review`, `published_at`, `views`, `likes`,
  `comment_count`, `type`, `access`, `price`, `body`), joined `author` and `prediction`.
- `predictions` (`outcome`, `lock_price`, `resolved_price`, `return_pct`, `resolves_at`,
  `resolution_trading_date`, `direction`, `ticker`), joined `author` and `report`.
- `profiles.followers_count`, `created_at`, `headline`, `avatar_url`, `profile_config`
  (`pinned_report_id`, `show_member_count`, `accent`, `font_pairing`, `texture`).
- `tickers` (`symbol`, `name`, `sector`, `last_price`, `market_cap`), `follows`, `comments`,
  `saved_reports`, `subscriptions`, `plans`.
- The RPC `bump_dispatch_issue`.
