# Stoa — Video

### Video is the main character. Every other block on a report supports the analyst's face and voice making the call.

This doc is the source of truth for the video subsystem: the pipeline, the gating, the data
contract, and the direction. Where it differs from other docs on video, this one wins.

---

## Why video leads

An analyst's edge is judgment, and judgment is easier to trust when you watch someone make it.
A locked call proves *what* they said; the video proves *how they thought*. The written report is
the record; the video is the conviction.

That ordering has a monetization consequence, which is the practical reason it matters: text is
the free tier that earns discovery, and video is what a subscription is actually for. Video is
the only block in the editor with per-block plan gating built into the node itself.

**Positioning:** every report should be able to open with the analyst on camera. The written
thesis, the call block, and the fact-check are the receipts underneath it.

---

## The pipeline

Four moving parts. Components never talk to a provider directly; everything goes through routes.

```
writer                         Stoa                          Bunny Stream
  |                              |                                   |
  |-- insert /video block ------>|                                   |
  |                              |-- POST /api/video/upload -------->|
  |<-- one-time upload URL ------|<-- { uploadUrl, providerAssetId } |
  |-- file straight to provider ---------------------------------->  |
  |                              |                                   |
  |                              |<-- webhook: "video 4 is done" ---|
  |                              |    secret checked, then the API   |
  |                              |    re-read decides the real state |
reader                          |                                   |
  |-- open report -------------->|                                   |
  |                              |-- entitlement check (see below)   |
  |<-- signed iframe src --------|<-- getPlaybackToken ------------- |
```

| Piece | File | Job |
| --- | --- | --- |
| Provider interface | `src/lib/video/provider.ts` | `createDirectUpload`, `getPlaybackToken`, `verifyWebhook`. Bunny Stream is the platform; the interface exists so a swap costs one file. |
| Upload route | `src/app/api/video/upload/route.ts` | Creates the Bunny video and presigns a TUS upload. The file goes browser → Bunny; it never touches Stoa's servers. |
| Token route | `src/app/api/video/token/route.ts` | Entitlement check, then a short-lived signed playback token. The only way to get a playable src. |
| Webhook | `src/app/api/webhooks/bunny-stream/route.ts` | Checks the URL secret, re-reads the asset from Bunny, then flips `video_assets.status`. |
| Data layer | `src/lib/db/videos.ts` | The only place `video_assets` rows are read or written. |
| Editor node | `src/lib/editor/tiptap/nodes/video-node.ts` | The `videoNode` schema and attributes. |
| Node view | `src/components/editor/tiptap/nodes/video-node-view.tsx` | Upload UI for writers, player or locked tease for readers. |

**Env** (all optional — with none set, `getVideoProvider()` returns a deterministic **mock**
that serves public sample clips, the same fallback pattern the market and AI providers use, so
local dev and CI never need a live key):

```
BUNNY_STREAM_LIBRARY_ID
BUNNY_STREAM_API_KEY
BUNNY_STREAM_CDN_HOSTNAME          # pull zone, for posters
BUNNY_STREAM_TOKEN_KEY             # optional: token-authenticated embeds
BUNNY_STREAM_WEBHOOK_SECRET        # optional: shared secret in the webhook URL
```

---

## Gating — the part that must never regress

Video is the most valuable thing behind the paywall, so its entitlement path is the one most
worth attacking. Three independent layers, and **all three must agree**:

1. **RLS** (`video_read` on `video_assets`) — the row is invisible unless the reader is the
   creator or the linked report is publicly readable. Hard backstop at the database.
2. **`canReadReport`** (`src/lib/access/can-read.ts`) — the readable front check mirroring the
   `report_bodies` policy: author, or published, plus free / unlocked / active subscription.
3. **`meetsPlanRank`** — per-block `minPlanRank` on the node itself, so a cheaper subscription
   can see the report and still not the video.

A reader who fails any layer gets **403 → the locked tease**: blurred poster, upgrade chip, no
playable URL anywhere in the response. Never a hidden `<video>` element; CSS-hidden video is a
launch blocker, not a styling choice.

> **Regression history — read before touching entitlement.** These layers are duplicated on
> purpose, which means they can silently disagree. In July 2026 the RLS fix that made
> `resolution_pending_review` reports readable was not mirrored into `canReadReport` *or* the
> `video_read` policy, so a fully-paid subscriber got a 404 on the asset and a 403 on the token
> for a report they were entitled to. Fixed in migrations `0036`/`0037`. **Any change to report
> visibility must be applied to all three layers in the same PR.**

**Why the webhook is not signature-verified.** Bunny Stream, unlike Cloudflare, sends no HMAC
header — its payload is just `{VideoLibraryId, VideoGuid, Status}`. So the route does three
things instead: compares a shared secret carried in the webhook URL you configure in the Bunny
dashboard, rejects a mismatched library id, and then **re-reads the asset from the Bunny API and
writes that** rather than trusting the body. Treat the webhook as a nudge, never as a source of
truth.

---

## Data contract

`video_assets` — created in `supabase/migrations/0023_research_platform.sql`.

| Column | Notes |
| --- | --- |
| `id` | Stoa's asset id. This is what the `videoNode` stores, never the provider id. |
| `creator_id` | Owner. Drives RLS and `meetsPlanRank`. |
| `report_id` | Nullable: a video can be uploaded before its report exists. |
| `provider` | `bunny` in production, `mock` for seeded demo rows. |
| `playback_id` | Provider asset id. Server-side only; never rendered raw to a client. |
| `poster_url` | The frame shown before play, and blurred for the locked tease. |
| `duration_s`, `aspect_ratio` | Reserve player space so arrival causes no layout shift. |
| `status` | `uploading` → provider-ready, flipped by the webhook. |

**Node attributes** (`videoNode`): `assetId`, `caption`, `posterUrl`, `aspectRatio`,
`minPlanRank`.

---

## Rules

1. **Never expose a playback URL without going through the token route.** Not in props, not in
   serialized page data, not in JSON-LD. The signed token is the only key.
2. **The provider is behind the interface.** No component imports Bunny. Swapping to Mux
   should touch `provider.ts` and nothing else.
3. **Reserve the frame.** Use `aspect_ratio` for the player box before the source loads. A video
   that pops in and shoves the thesis down the page is a CLS bug.
4. **Poster first, bytes on intent.** Never autoplay, never preload a full source. The poster is
   the page; the video loads when the reader asks for it.
5. **The locked tease is a real design surface**, not an error state. It is the upgrade pitch,
   so it gets the blurred poster, the plan name, and a working upgrade path.
6. **Reduced motion applies.** No auto-playing motion behind text, ever.

---

## State of the build

**Shipped and working end-to-end:** provider abstraction, Bunny TUS direct upload with progress,
secret-checked webhook that re-reads state from the API, token-authenticated embeds, three-layer
gating with the locked tease, `video_assets` + RLS, editor node with upload UI, per-block plan
rank, and a mock provider so none of it requires keys to explore.

**Seeded demo data.** `npm run seed` attaches a mock video to roughly 60% of research reports,
always in the lead position, and gates some of them a tier above their report so the locked tease
is seeded too. Rows carry `provider = "mock"`; `purge_demo_author` clears them (migration
`0042`) so re-seeding stays clean.

**What "main character" implies that does NOT exist yet.** Today video is one of roughly fourteen
slash-menu blocks, filed under *Data*, with the subtitle "Subscriber-gated video upload." A
writer has to know to reach for it, and a reader meets it partway down a text report. Nothing in
the product treats it as the lead. Closing that gap is product work, not a docs change:

- No video-first report type or template; no "record your take" entry point in compose.
- The reading view has no lead-video slot above the thesis.
- Feed cards, the dispatch, and OG images have no video affordance — a report with video looks
  identical to one without, so the most valuable content is invisible at the moment of choosing.
- No transcript, chapters, captions, or duration surfaced anywhere. Captions in particular are an
  accessibility requirement the moment video leads.
- `AudioBrief` (TTS) exists separately and overlaps conceptually; the two should be one media
  story, not two features.

See `docs/ROADMAP.md` for sequencing.
