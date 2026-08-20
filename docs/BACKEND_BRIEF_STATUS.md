# Backend brief: implementation status

Tracks `docs/BACKEND_BRIEF.md` against what is now built. Migrations 0049-0053.

Numbering note: migrations 0046-0048 belong to the scale-hardening branch
(caching, idempotency, rate limiting, jobs). They are already applied to the
hosted database but their files land with that PR, so this work starts at 0049.

## Done

| Item | What landed | Migration |
|---|---|---|
| 1. Publication metadata | `publication_tags` taxonomy table (the closed list moved out of TypeScript so it is enforced by the DB and can gain a tag without a deploy). `reports.primary_tag`, `secondary_tags`, `theme_tag`, `scheduled_for`, with a trigger validating the max of 2 secondaries, no repeat of the primary, and known slugs only. Indexed for discovery placement (`primary_tag`), search (GIN on the array) and the scheduling scan. Tags now persist from Compose through draft save and publish, and the three `THEME_TAG_PLACEHOLDER` read paths use the stored tag with the ticker's sector as the legacy fallback. | 0049 |
| 4. Engagement events | `engagement_events`, insert-only, range-partitioned by month from the start rather than converted under load later. Eight kinds (impression, play, watch_progress, swipe_depth, cta_reach, unlock, subscribe, follow_from_surface). RLS allows insert of your own or anonymous rows and has no SELECT policy at all, so the funnel is service-role-only by construction. Batched ingest at `POST /api/engagement`; a client batcher flushes every 10s, at 50 events, and on page-hide via `sendBeacon`. Wired into the Feed player, which previously recorded nothing. | 0050 |
| 2 + 3. Evidence cards and the per-card paywall | `publication_cards` (`report_id`, `position`, `kind`, `locked`, `payload jsonb`). RLS is the enforcement point, not the query, so it holds for any read path added later: an unlocked card follows the parent report's visibility, a locked card additionally requires entitlement via the same paywall predicate as `report_bodies`. Zod validation per card kind at the write boundary, which is what makes the stored payload safe to trust on read. The read path additionally rebuilds locked cards as empty shells, so even a service-role read path cannot hand gated prose to the browser. The feed builder reads stored stacks with the deck+unlock stack as the fallback. | 0051 |
| 5. Instrument follows | `follows_instruments` (`owner_id`, `kind` in ticker/etf/sector/theme, `symbol`), owner-only RLS. `GET/POST /api/follows/instruments` plus server actions. The `useWatchlist` / `useSectorWatchlist` hooks keep their exact shape so no call site changed: they paint from localStorage, then reconcile with the server, importing the local list once per browser. A follow now survives a device change. | 0052 |
| 6. Discussions | `comments.parent_id` with a trigger enforcing exactly one level (a reply to a reply is rejected) and that a reply belongs to its parent's report. `comment_likes` per user, so the UI can render a like as on for this reader, with a trigger keeping the existing `comments.likes` counter in step. Reads are thread-aware: the per-report cap counts top-level comments and keeps a reply only when its parent survived, so replies are never orphaned. `postFeedComment` now honours `parentId` instead of discarding it. | 0053 |

Also done, as part of item 1's "authoritative badge": `Cards` is now a real
content badge on Today and the profile tiers, from a presence-only query.

## Verified, not assumed

- **Per-card paywall.** With the anon key, reading the cards of a paid published
  report returns the free card and omits the locked row entirely; a grep for the
  seeded secret text across all cards returns nothing. The author of the same
  report sees both rows. Both directions, so the policy is neither leaky nor
  over-strict.
- **Comment threading.** A one-level reply inserts; a reply to a reply is
  rejected with "replies are one level deep"; the like counter goes 0 to 1 to 0
  across an insert and delete of a `comment_likes` row.

## Deviation from the brief, on purpose

**The Steelman text is not on `reports`.** The brief specified
`reports.steelman_objection` / `steelman_answer`. `reports` is public-read for
published rows and is queried with `select("*")` in many places, so gated prose
stored there would be readable by anyone holding the anon key, whatever an
app-layer flag said. The text is therefore a `publication_cards` row of kind
`steelman`, which RLS already gates per card; only the two placement booleans
(`steelman_box_locked`, `steelman_card_locked`) live on the report, since a
boolean leaks nothing.

Consequence worth knowing: independent gating holds in the safe direction. The
box can be stricter than the card. A box configured as free while the card is
locked fails closed for a non-entitled reader, because the payload never leaves
the database.

Two smaller judgement calls:

- **Content flags are derived, not stored.** The brief offered either. Every read
  path already joins the clip, the prediction and the body, so deriving avoids
  four denormalised booleans that can drift out of step with reality.
- **A primary tag is not required server-side at publish.** The Compose gate asks
  for one only in video mode, and publications written before tags existed have
  none. Requiring it in `validateAndPublishReport` would have blocked
  written-report publishing. Slugs and limits are still validated on every write.

## Not built, and why

| Item | Status |
|---|---|
| 7. Lifecycle stages job | Needs item 4 to have collected a fortnight of events before a windowed rate beats the per-request proxy, which still runs. |
| 8. Coverage counts | Shares one pg_cron job with item 7; building them separately means writing the job twice. |
| 9. Notifications | Not started. Ship the new kinds and the preferences table together, per the brief. |
| 10. Video overlay storage | Not started. Route (c), player-rendered from stored JSON, is the recommended starting point. |
| 11. Sector index | Not started. The ETF-proxy route is a day. |
| 12. Smaller items | Not started; independent, pick off in any order. |
| 13. Pricing consolidation | Blocked on a product decision, not on engineering. |
| 14. Scoring formula | Dormant until a score is shown publicly again. |

## Follow-up when the scale-hardening PR merges

`ensure_engagement_partitions()` should be called alongside
`ensure_video_view_partitions()` in `/api/cron/maintenance` (that route ships
with the hardening branch). One line. The default partition means inserts never
fail meanwhile, so this is housekeeping rather than a correctness fix.
