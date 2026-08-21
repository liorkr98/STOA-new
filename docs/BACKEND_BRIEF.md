# Stoa — Backend brief

For Krisi. Written at the end of the frontend build run of August 2026 (see `docs/BUILD_SPEC.md`
for what was built). Every item below is something the frontend now renders as a placeholder,
holds in memory, or derives from a proxy, and needs the backend to become real. The frontend
never touched the schema, money or pricing, or existing data; where it needed a column it did not
add one, it collected the need here.

Structure: the four cross-cutting concerns first (they apply to every item), then the gap list in
priority order with, per item, what the frontend does today, what it needs, and how each concern
applies. A suggested sequence with dependencies and rough sizing is at the end.

Corrections to assumptions in the build spec are called out inline; four matter:

- **Video storage exists and is intended.** `video_clips` (migration 0042: `bunny_video_guid`,
  `playback_url`, `thumbnail_url`, `preview_url`, `caption_vtt_url`, `transcript`,
  `duration_seconds`, `status processing|ready|failed`, `published_at`) plus `video_view_events`
  (`watched_seconds`), on Bunny Stream via TUS upload and a ready webhook, is the deliberate video
  layer for the publication's clip. The frontend reads it for the profile shelves, Today, Explore
  and the Feed. The remaining gap is **not** the video entity: it is overlay and thumbnail
  persistence, and the burn-in question (item 10).
- **`video_assets` is a second, parallel video system.** It is written by the report editor's
  inline video block (`video-node-view.tsx` to `/api/video/upload`, `/api/video/token`, the
  Cloudflare Stream webhook; `provider` defaults to `cloudflare`, columns `playback_id`,
  `poster_url`, `duration_s`, `aspect_ratio`, `transcript jsonb`, `chapters jsonb`, `status`).
  There is no schema conflict with `video_clips` (no shared keys; `video_view_events` references
  `video_clips` only; RLS is separate). The conflict is conceptual: two providers, two tables, two
  meanings of "video". **Recommendation: retire the inline Cloudflare block.** Two providers means
  two sets of costs, webhooks, failure modes and support paths for one concept, and the inline path
  is invisible on every video-first surface anyway, so a creator who uses it silently produces a
  publication that reads as *written* on the profile tiers, Today, Explore, the Feed and the Studio
  list. If it is kept, the video-first surfaces need to treat it as "has video" and take a poster
  from `poster_url`, which means teaching five read paths about a second provider. Flagged, not
  changed.
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
the item. Items with no meaningful regional dimension say so rather than leaving it silent.

### 1. Scalability

- **Query shape.** The frontend's list builders (`src/lib/today/build-today-page.ts`,
  `src/lib/markets/build-explore.ts`, `src/lib/landing/build-landing.ts`, `src/lib/explore`)
  each pull one bounded pool per request (80 to 120 newest publications, 40 analysts, 24 resolved
  calls, 120 clips) and derive lists in memory. This is fine at 1x and holds to roughly 10x rows,
  but every request re-derives trending/popular from the pool. Past that, the lifecycle stages
  and the trending/popular lists should be materialised (item 7) and read, not computed.
- **N+1 risks that exist today.** `listCommentsForReports` batches; the Studio publications
  list batches clips; `buildToday` (legacy) did per-symbol counts. New per-row calls to avoid:
  sector lookups per ticker (already batched via `listTickerRows`), quotes per symbol (batched via
  `getQuotesBatch`), any per-publication cards fetch once cards exist (item 2 should be one query
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
- **What breaks at 10x volume.** The in-memory lifecycle computation over a 120-row pool stops
  being representative (the population median drifts); the coverage counts (`tickerCoverage`,
  `coverageCounts` with `limit(2000)`) silently truncate; the Explore wall's ranking degrades to
  "newest 90". Items 7 and 8 fix all three.
- **No numbers here, deliberately.** Nobody supplied current row counts or traffic, so every
  threshold above is a shape, not a measurement. Before building item 7, count publications,
  clips and monthly readers; if the pool is still in the hundreds, the proxy is fine and the job
  can wait.

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
- **Reader-side.** The Your Tickers list is browser-local (item 5) and re-resolves prices on
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
  flags and renders sealed cards from *card metadata only*; once cards are stored (item 2), the
  API must omit locked card bodies for non-entitled readers, not just flag them. Same rule the
  report page already follows for `report_bodies` (RLS-gated). Confirm the per-card entitlement
  is enforced server-side, since the creator sets the reveal line per card, not per report.

### 4. Regionality

- **Video.** Bunny Stream serves from its CDN; confirm the storage zone/replication covers Israel
  and the US (Bunny's default pull zone is global; the *storage* region is chosen per library),
  and that thumbnails/previews are served from the same edge. Adaptive bitrate is Bunny's; a
  burn-in worker (item 10), if one is ever built, must run near the storage region to avoid
  pulling every source across regions.
- **Database and edge.** Supabase project region is single; Vercel functions default to
  `iad1`. For Israeli readers every dynamic page pays a US round trip; consider Vercel edge or a
  regional function for the read-heavy public pages (Today, Verdicts, Markets) once caching
  exists, and keep writes central.
- **Market data.** Yahoo is called from the server region; TA-35 (`TA35.TA`) resolves. Data
  residency: no personal data leaves Supabase; the only third parties receiving user-derived data
  are Bunny (uploads) and PayPal.

---

## The gap list, in priority order

**Read this first: schema is not what is keeping the Feed empty.** The Feed, Explore and Today
are thin today because almost nothing has been published with a video, not because a table is
missing. `video_clips` works end to end. No item below makes those surfaces populated; only
analysts publishing does. The ranking here is therefore by *what unlocks the most product depth
per unit of work*, not by what looks most broken.

That is a change from the first draft of this brief, which put video first on the build spec's
assumption that no video entity existed. It does exist, so the video work (item 10) is creator-side
polish and drops well down the list.

### 1. Publication metadata: tags, theme tags, content flags

*The cheapest unlock on the list. Everything about discovery placement depends on it.*

**Today.** Content badges are built from what is stored (clip present, prediction present,
`type = research` or a long body); "Cards" is never claimed. Callless items anchor on the ticker's
sector from `tickers.sector` (`THEME_TAG_PLACEHOLDER` in code), which is a stand-in, not the
analyst's own tag. Tags exist only in the Compose picker and are discarded on save.

**Needed.**
- `reports.primary_tag text`, `reports.secondary_tags text[]` (max 2), validated against the
  taxonomy (or a `tags` table the taxonomy moves into). Auto-fill from the call's sector stays a
  frontend concern.
- `reports.theme_tag text` for callless items (or derive from `primary_tag`).
- `reports.content_flags` (or derive `has_video`, `has_call`, `has_thesis`, `has_cards` at read
  time) so the badge is authoritative and cheap.
- `reports.scheduled_for timestamptz` for scheduling (the Studio list already has a
  `scheduled` state with nothing behind it).
- Scalability: index `primary_tag`; secondaries are searchable-only, so a GIN index on the array
  is enough. Caching: tags change only on publish/edit. Rendering: add secondaries to the search
  index. Regionality: none.

### 2. Evidence cards (the Card Engine) and the Steelman

*This is the depth of the product. Without it the Feed is a video and a headline.*

**Today.** The Feed player renders nine card formats (`src/lib/feed/types.ts`: thesis, edge,
path_to_target, kill_switch, catalyst_timeline, checklist, figure, steelman, unlock) with
three-ink provenance and per-card `locked`. Live publications get only a case card (the deck)
and the unlock card (`CARDS_PLACEHOLDER`). Every richer format exists only in `/dev/feed`.

**Needed.** A `publication_cards` table (`report_id`, `position`, `kind`, `locked bool`,
`payload jsonb` matching the discriminated union, `created_at`) or a `cards jsonb` column on
reports if you prefer one row. The Steelman needs the Devil's Advocate objection and the
analyst's answer stored (`steelman_objection`, `steelman_answer`, plus independent free/locked
flags for the report-page box and the stack card, since the two placements gate independently).
Provenance (`plain|creator_est|auto`) is per value inside the payload; AUTO values should carry
a source reference.

Scalability: one query keyed by publication ids, never per card. Caching: cards change only on
publish/edit. Rendering: locked payloads must be stripped server-side (item 3, and concern 3).
Regionality: none.

### 3. Server-side paywall, per card

*Ships with item 2. Cards are worse than useless if locked payloads leak.*

Gated content must never be sent to the browser. `report_bodies` is RLS-gated; once cards exist
the same must hold per card, and the Feed player's data path must strip locked payloads for
non-entitled readers rather than sending them flagged. Confirm entitlement (`report_unlocks`,
`subscriptions` with plan rank and perks) is checked in the query, not the component. An RLS
policy on `publication_cards` that joins entitlement is the safest shape, because it holds no
matter which read path is added later.

Scalability: the entitlement join runs on every card read, so index `report_unlocks (user_id,
report_id)` and `subscriptions (subscriber_id, analyst_id, status)`. Caching: never cache a
card payload across readers; cache by (report, entitlement class) or not at all. Regionality: none.

### 4. Engagement events (the write path only)

*Start collecting now. History cannot be backfilled, and item 7 is worthless without it.*

**Today.** `video_view_events` (watch seconds, creator-scoped) and `report_views` exist. Nothing
records impressions, swipe depth, CTA reach, or which surface a follow came from, so the
lifecycle model runs on a proxy (item 7).

**Needed.** A table (`actor_id nullable`, `report_id`, `kind: impression | play |
watch_progress | swipe_depth | cta_reach | unlock | subscribe | follow_from_surface`,
`value numeric`, `surface text`, `created_at`). Insert-only, RLS insert-for-anyone / select-for-
service-role. This is a day of work whose value compounds with every day it exists earlier.

Scalability: this is the highest-volume table in the product; partition by month or plan to prune,
and never read it on a request path. Caching: none, it is write-only from the app. Rendering: the
client should batch and send on idle, not per event. Regionality: writes can go to any region.

### 5. Instrument, ETF and sector follows

**Today.** Analyst follows are server-side (`follows`). Ticker and sector follows are
browser-local (`localStorage` keys `stoa-watchlist`, `stoa-sector-watchlist`;
`src/lib/watchlist.ts`), so Your Tickers on Today re-resolves from the client and no ETF or
sector follow survives a device change. Today's sidebar tops up short personal lists with
suggestions carrying a small Follow control: creator follows go to `follows` through
`toggleFollow` (server-side, real); ticker follows write the browser-local watchlist, so they do
not survive a device change and the server never sees them.

**Needed.** A `follows_instruments` table (`owner_id`, `kind: ticker|etf|sector|theme`,
`symbol text`, `created_at`, PK owner+kind+symbol) with RLS owner-only, plus a one-time import
endpoint the client can call to migrate its local list. This underpins Today's Your Tickers,
Markets' Follow controls, and the engagement algorithm's affinity term.

Scalability: tiny table, index on owner. Caching: reader-scoped only. Rendering: keep the client
fallback until the table exists, then drop it. Regionality: none.

### 6. Discussions

**Today.** `comments` is flat (`report_id`, `author_id`, `body`, `likes`). The Feed discussion
renders one-level nesting and flattens deeper replies with an @mention; live replies post as
top-level comments carrying the mention (`COMMENTS_PLACEHOLDER`).

**Needed.** `comments.parent_id uuid null references comments(id)` with a check that a parent
has no parent (one level), an index on `(report_id, parent_id, created_at)`, a `comment_likes`
table (`comment_id`, `user_id`, PK both) so likes are per user rather than a counter, and an
`is_author` derivation (compare `author_id` to `reports.author_id`; the frontend does this by
handle today). `postFeedComment` in `src/app/actions/feed.ts` already accepts `parentId` and
ignores it.

Scalability: one query per report, already batched across the Feed. Caching: comments are the
freshest thing on a page; do not cache. Regionality: none.

### 7. The lifecycle stages job

*Depends on item 4 having collected data for a while.*

**Today.** `src/lib/lifecycle/stages.ts` computes NEW / AVERAGE / RISING / TRENDING / POPULAR
per request from a proxy: attention per day since arrival (`views + 5*likes + 10*comments`),
compared with the population median of the current pool. Constants are named and grouped
(`LIFECYCLE`, `EXPLORE`) and documented in place. This drives Explore's tile sizes, Today's
lead/secondary/Trending Now, the sidebar's trending lists, and the NEW / TRENDING markers.

**Needed.** A job (pg_cron, every 10 to 15 min) that computes per-publication and per-creator
attention over the last 48h against the prior 14d and writes `stage`, `trending_score`,
`attention_rate` to `reports` / `profiles` (or a `lifecycle_snapshots` table). The frontend then
reads the stage instead of computing it; the proxy stays as a fallback for rows the job has not
touched.

Scalability: this is what removes the per-request in-memory ranking. Caching: the job's cadence
is the cache. Rendering: markers are plain data. Regionality: the job runs where the database is.

### 8. Coverage counts and the tape

*Shares the job with item 7. Build them together.*

**Today.** `tickerCoverage` and `coverageCounts` scan up to 2000 report rows per request; theme
momentum (this week vs last) is two such scans. The tape is live Yahoo (indices, futures, TA-35)
plus the eight most-covered tickers.

**Needed.** A materialised `ticker_coverage` (`symbol`, `all_time`, `last_7d`, `prior_7d`,
`analysts`, `open_calls`) refreshed by the same pg_cron job as item 7.

Scalability: removes the biggest repeated scan in the product. Caching: refresh cadence is the
cache. Rendering: the tape is server-rendered; keep it out of the page's critical path (concern
3). Regionality: none.

### 9. Notification types and preferences

**Today.** `notify_report_event` emits like / comment; the app also creates follow / publication
/ subscribe / sale. All "good to know". No preferences, so anything added is unmutable.

**Needed.** The "needs you" kinds: `call_resolved` (for followers of the analyst and for the
analyst), `call_resolving_soon` (horizon within N days), `subscription_renewing`,
`payment_failed`, `payout_ready`. A `notification_preferences` table (or jsonb on profiles) with
per-kind email and in-app toggles. Ship preferences in the same change as the new kinds, not
after.

Scalability: the bell must stay a single indexed query on `(recipient_id, read_at is null)`.
Caching: none. Regionality: email delivery is the only regional consideration, and it is the
provider's.

### 10. Video: overlay persistence, and the burn-in question

*Creator-side polish, not a reader blocker. The video pipeline already works.*

**Today.** `video_clips` on Bunny works end to end (upload, processing, ready webhook, captions,
transcript). The Compose video rung (`src/components/compose/video-rung.tsx`) lets a creator pick
a file, choose a thumbnail frame or upload one, trim, and place text and visual overlays on two
tracks with a faithful preview. All of it is held in memory: nothing stores the edit, and
publishing with overlays is not wired. The processing panel
(`src/components/compose/processing-state.tsx`) and the Studio list read the clip's real `status`.

**Needed, and cheap: overlay storage.** A `video_edits` (or `video_clip_edits`) row per clip:
`trim_start`, `trim_end`, `thumbnail` (`{type: frame, time}` or `{type: upload, url}`),
`overlays jsonb` (the `Overlay[]` shape in `src/lib/compose/overlays.ts`: text with position 1..9
and size, or visual with source, mode cutaway|inset, position, and start/end seconds). Also
`thumbnail_url` from a chosen frame: Bunny sets a thumbnail at a timestamp (`thumbnailTime`), and
an upload is a storage put plus a `thumbnail_url` update.

**Open decision: how overlays reach the viewer.** The build spec called for burning them
permanently into the video file. Two routes, and the recommendation is to start with the second:

- **(a) Burn-in.** A worker (ffmpeg with drawtext / overlay filters, or Remotion) pulls the
  source from Bunny, composites, and uploads a new Bunny video. Bunny's own overlay support is a
  static watermark only, so it does not cover timed cutaways. Cost: a queue plus a small
  always-on worker or a job service (pg_cron with an Edge Function is too weak for ffmpeg),
  roughly real-time to 2x on a 90-second clip, and a second Bunny video per publish. Publish
  becomes: create report, create clip (processing), enqueue burn-in, mark ready on completion.
  Add a `stage` column (`transcoding|compositing|captions|ready`) if the processing panel's step
  list should be exact rather than elapsed-based.
- **(c) Player-rendered overlays from the stored JSON. Suggested starting point.** The player
  draws the same overlays it already draws in the Compose preview, reading `overlays jsonb` at
  playback. Cost is a column and a render path, no worker, no queue, no second video, no
  regional pinning. It is also reversible and editable after publish, where burn-in is not.

**The tradeoff, plainly: burned-in overlays survive leaving Stoa, player-rendered ones do not.**
A clip downloaded, embedded elsewhere, or shared to another platform carries its captions and
cutaways only if they are baked into the file. Inside Stoa the two are indistinguishable to a
viewer. So the question is really *when outward sharing matters*: until it does, (c) delivers the
whole feature for a fraction of the work, and (a) remains a clean later upgrade because the stored
JSON is exactly the burn-in job's input. Note that (c) contradicts the spec's "overlays are
permanent once published" rule, which would need softening in the Compose copy.

**Other video work.** `video_view_events` is RLS-scoped to the creator, so "most watched" uses
`reports.views`; either add an aggregate (`video_clips.view_count`, `watch_seconds_total`)
maintained by trigger, or a public materialised count. And see the `video_assets` recommendation
at the top of this brief.

Scalability: one clip per publication is assumed everywhere (`clipByReport` maps); if a
publication can have several, add `is_primary`. Caching: clip ready invalidates profile/Explore.
Rendering: embed URLs stay server-built. Regionality: only route (a) has one, and it is real.

### 11. Sector index data

**Today.** No sector index series exists. The sector page header shows an equal-weight average of
its constituent day changes, labelled as such, and the performance chart renders its structure
with a note instead of a line, rather than inventing a series.

**Needed.** One of: a nightly `sector_index` series computed from constituent closes (real, and
yours), or an ETF proxy per sector (XLK, XLE, XLF and so on) stored in config, which is a day of
work and immediately honest if labelled as a proxy. Either unblocks the sector performance chart
against the S&P.

Scalability: a small time series. Caching: daily. Rendering: the chart is server-rendered.
Regionality: none.

### 12. Smaller items, unpacked

Each of these is independent and small. Sizes are rough.

| # | Item | What it needs | Size |
|---|---|---|---|
| 12.1 | Privacy toggle, "show who I follow" | A boolean, either `profiles.show_following` or a `profile_config` key, plus a filter on the Following list read | half a day |
| 12.2 | Avatar and cover upload | A Supabase Storage bucket with owner-only RLS, signed upload URLs, and writes to `profiles.avatar_url` / `cover_url` (both columns exist) | 1 to 2 days |
| 12.3 | Account deactivation | `profiles.deactivated_at timestamptz`, an auth guard, and a filter on every public read of profiles and their publications. Touches many read paths, which is why it is not half a day | 2 to 3 days |
| 12.4 | Subscription tier names | `subscriptions.plan_name text` snapshotted at purchase (a join to `plans` renames history when a tier is renamed, which is wrong on a receipt) | half a day |
| 12.5 | "Most popular" tier flag | `plans.is_featured boolean`, one per analyst enforced by a partial unique index | an hour |
| 12.6 | Per-publication unlocks and revenue | An aggregate over `report_unlocks` and `wallet_transactions` keyed by report, as a view or a maintained column. The Studio list shows `—` for both today | 1 to 2 days |
| 12.7 | Subscriber growth series | Either a daily snapshot table or a derivation from `subscriptions.created_at` / `cancelled_at`. A snapshot is more honest once cancellations exist | 1 day |
| 12.8 | Boost live stats, pricing and history | `profile_boosts` needs impressions and clicks, the price paid, and a history of past runs. Currently the Boost page can show a boost exists but not how it performed | 2 to 3 days |
| 12.9 | Payout history | A `payouts` table (PayPal payout batch id, amount, status, created_at, analyst) fed by the PayPal payout webhook. Blocked on the payout flow itself | 2 to 3 days, PayPal-dependent |

Housekeeping, not features: `dispatch_meta.bump_dispatch_issue` is idempotent per day and fine.
The `updateProfileConfig` action used to overwrite `profile_config` with a partial object (which
would erase accent, pinned report and storefront sections); it now merges, but a database-side
guard is worth it if `profile_config` gains more owners. And `package-lock.json` is the only
lockfile while the `supabase:*` scripts shell out to `pnpm dlx`; confirm it stays in sync with
`package.json` in CI.

### 13. Pricing consolidation (decision first; do not migrate)

Two parallel systems: `plans` (rich tiers, drives tier subscriptions and report gating) and the
legacy flat `profiles.sub_price` / `profiles.report_price` (still the fallback subscribe price and
the default report unlock price, edited in two duplicate places). The `/pricing` marketing page is
hardcoded. Consolidating means deciding where the two fallbacks come from once tiers are the only
system, and reading `/pricing` from a shared constant. The frontend did not touch any of this and
should not until the decision is made.

### 14. The scoring formula and `formula_version`

Dormant: scores are no longer displayed publicly, only in the analyst's private track record, so
nothing here blocks a reader-facing surface. The docs describe a modified Elo (600 to 1400); the
shipped engine computes a Wilson win-rate / profit-factor / alpha composite
(`src/lib/engine/scoring/formula.ts`, versioned, with a recompute path). Before a score is ever
shown publicly again: settle the formula, add `formula_version` to `profiles` and
`moat_score_snapshots`, and recompute all analysts together in one pass.

---

### 15. `purge_demo_author` cannot delete a locked report

**What happens today.** `purge_demo_author` (migration 0034) is the only sanctioned way to clear
demo content, and it has never worked. It sets `app.allow_prediction_delete` so
`prevent_prediction_delete` lets the calls go, then runs `delete from reports` straight into
`prevent_locked_report_delete`, which has no equivalent escape hatch and refuses anything locked
or `published | archived | resolution_pending_review`. Every report is locked at insert by
`set_locked_at_on_insert`, so the delete always raises `Locked reports cannot be deleted, only
archived.` and, because the function is one transaction, the prediction delete rolls back with it.
The function clears nothing and reports no error to anything that does not read the RPC response.

The same guard makes the demo accounts undeletable: `auth.admin.deleteUser` cascades
`profiles -> reports`, the BEFORE DELETE trigger fires on the cascade, and the delete fails.

**What it costs.** `scripts/seed-demo.ts` and `scripts/demo-teardown.ts` currently archive instead.
Archiving is genuinely sufficient for *reading* surfaces, because `reports_read` (migration 0036)
is `status in ('published','resolution_pending_review') or author_id = auth.uid()`, so an archived
report is invisible to every reader at the database level, and `predictions_read` and
`can_read_report_body` both gate on the parent report's status, so calls and evidence cards go with
it. But it conceals rather than removes: the rows stay, every reseed adds another archived layer,
and `demo:teardown` cannot deliver the single-command removal it is supposed to. The demo dataset
is currently ~330 archived publications that nobody can clear.

**What it needs.** Give `prevent_locked_report_delete` and the DELETE branch of
`prevent_locked_body_edit` the same transaction-local escape hatch `prevent_prediction_delete`
already has (say `app.allow_demo_purge`), and set it inside `purge_demo_author` alongside the
existing `app.allow_prediction_delete`. The public record stays protected for every other caller:
the setting defaults to off, is scoped to one transaction via `set_config(..., true)`, and is only
ever set inside `purge_demo_author`, which is `security definer`, granted to `service_role` alone,
and still refuses any account whose email is not `@stoa.demo`.

**Concerns.** *Trust*: this loosens two immutability triggers, so the review should be on the
scoping rather than the mechanism, which already exists for predictions. *Data*: nothing to
backfill; the archived rows can be deleted once the hatch exists.

**Related, and a decision for you.** `recomputeAllScores` (`src/lib/engine/recompute.ts`) selected
every prediction by `author_id` with no join to `reports`, while the displayed track record
(`listResolvedCallsWithReports`) filters to `report.status === 'published'`. A recomputed score
therefore counted calls the public record does not show, and archived demo calls would have been
folded straight back in. The recompute now filters to published parents so the two agree. That
raises a product question this brief cannot settle: **if archiving removes a call from the score,
an analyst can improve their record by archiving their misses.** Either archiving should be barred
once a call is locked, or the score should count archived calls while the record hides them, and
the two paths should then differ deliberately rather than by accident.

## Suggested sequence, dependencies and sizing

Sizes are rough and assume one person who knows this codebase. They are for ordering, not
planning.

**Two hard dependencies:**

1. **Items 7 and 8 share one pg_cron job.** The lifecycle stages and the coverage counts read
   the same tables on the same cadence and write to the same kind of materialised row. Building
   them separately means writing the job twice.
2. **Items 2 and 3 must ship together.** Stored evidence cards without a per-card server-side
   paywall means locked card payloads reach the browser, which is a paywall breach, not a bug to
   fix next sprint. Card storage and the entitlement-aware read path are one change.

One soft dependency: **item 7 needs item 4 to have been collecting for a while.** The windowed
velocity job compares the last 48 hours against the prior 14 days, so it needs at least a
fortnight of events before its output beats the proxy the frontend already runs.

**Suggested order:**

| Order | Item | Why here | Size |
|---|---|---|---|
| 1 | 1. Publication metadata | Cheapest unlock; discovery placement and the anchoring rule both depend on it | 1 to 2 days |
| 2 | 4. Engagement events, write path | A day of work whose value compounds with every day it exists earlier. Do it before anything that will want the history | 1 to 2 days |
| 3 | 2 + 3. Cards and the per-card paywall | The largest gain in product depth. Ship as one change | 2 weeks |
| 4 | 5. Follows | Personalisation across Today and Markets; small table | 1 to 2 days |
| 5 | 6. Discussions | Small, and the one place a reader talks to an analyst | 1 to 2 days |
| 6 | 10. Video overlay storage, route (c) | With player-rendered overlays this is a column and a render path, and it completes Compose | 2 to 3 days |
| 7 | 9. Notifications | Retention, and the "needs you" kinds are the ones that bring people back | 1 week |
| 8 | 7 + 8. Lifecycle job and coverage counts | One job, two outputs. Wait for item 4 to have history and for volume to justify it | 1 week |
| 9 | 11. Sector index | Unblocks one chart; the ETF-proxy route is a day | 1 to 3 days |
| 10 | 12. Smaller items | Independent, pick off in any order; see the table above | ~2 weeks total |
| 11 | 13. Pricing | Blocked on a product decision, not on engineering | decision, then days |
| 12 | 14. Scoring formula | Dormant until a score is shown publicly again | decision, then 1 day |
| later | 10(a). Burn-in worker | Only when outward sharing matters | 2 weeks plus running cost |

Roughly: the first five lines are about four weeks and cover most of the visible product depth.
Everything after is either scale work that is not yet needed, or work blocked on a decision.

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
