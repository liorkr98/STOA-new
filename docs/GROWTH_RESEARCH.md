# Attention, attraction and acquisition on Stoa

What actually makes people watch, come back, and bring someone else. Written against the
surfaces as they exist today (Feed, Explore, Today, the signed-out root), with the mobile
phone as the primary device.

Two rules constrain every idea below, and they are not negotiable:

- **No public scoring.** No score, rank, percentile or leaderboard on a public surface, and no
  aggregate stance across analysts. So the usual engagement crutches (leaderboards, "top
  analyst this week", consensus meters) are off the table. See `AGENTS.md`.
- **No 1:1 messaging.** Growth loops have to run on public surfaces and sharing, not DMs.

Stoa's substitute for a score is **the record**: seals, entry to exit, return. That is the
trust surface, and it is also the most under-used attraction asset in the product.

---

## 1. What the evidence says

### 1.1 The decision happens in the first seconds, and most people leave early

Measured viewing behavior on short-video platforms is brutally front-loaded: roughly **70% of
viewing sessions end before 20% of the video has played**
([arXiv 2603.22663](https://arxiv.org/abs/2603.22663v1)). Platform guidance and hook research
converge on the same checkpoints: the viewer decides at ~1s whether to stay past the first
frame, and at ~3s whether they have committed to the premise
([TrueFuture Media](https://www.truefuturemedia.com/articles/science-of-short-form-video-hooks)).

**Implication for Stoa.** The first frame and first three seconds carry the whole decision.
Anything that delays "what is this and why should I care" is the most expensive thing on the
screen. Stoa has an advantage here that generic creator platforms do not: a ticker, a
direction and a resolved seal are *instant* context. They should be legible at frame zero.

### 1.2 Startup delay causes abandonment, and the slope is known

The landmark causal study (23M views, Akamai traces, quasi-experimental design) found viewers
tolerate about **2 seconds** of startup, after which **each additional second raises the
abandonment rate by ~5.8 percentage points**. Rebuffering equal to just 1% of duration cut
watch time ~5%, and a viewer who hit a failure was 2.32% less likely to return within a week
([Krishnan & Sitaraman, IMC 2012](https://people.cs.umass.edu/~ramesh/Site/PUBLICATIONS_files/imc208-krishnan.pdf)).
Notably, viewers of **short** clips abandon *faster* than viewers of long content.

**Implication for Stoa.** Time-to-first-frame is a growth metric, not an engineering detail.
It should be measured from play intent to first rendered frame, per surface.

### 1.3 Almost nobody has the sound on, so muted video must still be readable

Estimates cluster tightly: **~92% of mobile video is watched with sound off**, ~85% on
Facebook feeds, ~79% of social video overall. Adding captions makes viewers **~80% more likely
to finish**, and raises average view duration by ~12% (Facebook internal) up to ~40% (3Play)
([Kapwing summary](https://www.kapwing.com/resources/subtitle-statistics/),
[Ascynd](https://ascynd.io/en/blog/do-captions-increase-video-views)). Separately, **80% of
viewers respond negatively to autoplaying sound**, so muted-by-default is correct and should
stay.

**Implication for Stoa.** This is the single largest gap found in the audit. Stoa autoplays
muted, and Bunny already produces a caption file per clip (`video_clips.caption_vtt_url`),
but nothing rendered it. An analyst saying "margins inflected this quarter" was, to 9 out of
10 phone viewers, a silent face.

### 1.4 Flow comes from low-cost interaction more than from the algorithm

A study of problematic short-video use (N=621, S-O-R model) tested three affordances against
flow. **Low-cost interaction was the strongest driver of flow**; multimodality second; and
**algorithmic recommendation was not significantly correlated with flow at all**
([Frontiers in Psychology](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.971589/full)).

**Implication for Stoa.** Ranking work has real value for relevance, but it is not what makes
a session feel effortless. Gesture cost, tap cost, and state that survives navigation matter
more. A mute toggle that resets on every page change is a flow tax paid on every session.

We take the descriptive finding and decline the prescriptive one: the goal is a session that
feels effortless while the reader chooses to be in it, not maximum time-on-app. Reward
desensitization from endless novelty is a documented downside
([DW summary of the literature](https://www.dw.com/en/how-tiktok-style-videos-keep-human-brains-hooked-on-content/a-77627720)),
and "you are caught up" is a feature for a research product, not a bug.

### 1.5 Value before signup, measured at day 7

> **Decision, later in the same pass: watching now requires an account.** The founder's call,
> on cost grounds, and the cost is real: streaming is the most expensive thing the product does
> per view, and an anonymous scroll spends it with no account to show for it. The research below
> still applies and is the tradeoff being accepted knowingly, so it stays on the page rather
> than being quietly deleted. What a stranger gets instead is the catalogue: Explore's posters,
> Today, a publication's own page, and one lead clip on the root that plays on a press. See
> section 6.

Activation benchmarks are definition-dependent, but the directional bands are consistent:
below 20% activation points at onboarding friction, 20-40% is typical, above 40% is strong
([PM Toolkit](https://pmtoolkit.ai/benchmarks/activation-rate-benchmarks)). Two findings are
more actionable than the bands:

- **Show value before asking for signup.** Products that let a referred visitor experience the
  thing before registering convert referred traffic **2-5x better** than products that gate it
  ([Native Viral Loop](https://nativeviralloop.com/knowledge/viral-coefficient.html)).
- **Day 7 is the verdict.** In Amplitude's cross-company data, ~7% day-7 retention puts a
  product in the top quartile, and strong day-7 correlated with strong three-month retention in
  ~69% of cases
  ([framework writeup](https://www.digitalapplied.com/blog/customer-onboarding-time-to-value-2026-saas-metrics-framework)).

**Implication for Stoa.** The Feed is already open to signed-out visitors, which is right. But
the signed-out root sent strangers to Sign up / Log in with no way to just watch. The best
asset in the product was one tap away and unlinked.

### 1.6 Sharing loops: cycle time beats coefficient

K = invites x conversion. Practical guidance: use the **native share sheet** (converts 30-50%
better than custom share UI), **pre-fill** the message (generic share buttons underperform
pre-written ones by 2-4x), place the prompt at a **peak value moment** rather than during
onboarding, and prioritize **cycle time** over raw K in early stages
([referral patterns](https://referralearl.com/in-app-referral-patterns/),
[k-factor guide](https://tolinku.com/blog/viral-coefficient-k-factor/)).

**Implication for Stoa.** The peak value moment is unusually well defined here and it is not
"finished watching a video." It is **resolution**: the moment a locked call gets stamped HIT or
MISS. That is the product's proof, it is public, it is permanent, and it is inherently
shareable without any growth-hack veneer. Stoa's share already uses `navigator.share`; what it
lacks is a reason to fire at the right moment.

---

## 2. What the audit found (state before this work)

| Area | Finding | Cost |
| --- | --- | --- |
| Captions | `caption_vtt_url` populated by the Bunny webhook, never rendered | Losing the ~80%-more-likely-to-finish effect on a muted feed |
| Sound | `useState(true)`, no persistence; resets on every mount | Flow tax; the reader re-mutes forever |
| Payload | `lightweight-charts` statically imported into the Feed route via `CardChart` | Chart engine shipped to every phone that opens `/feed` |
| Payload | Feed fetched 30 comments per report x 72 reports | Up to ~2,160 comment rows serialized into the first HTML |
| Acquisition | Signed-out root had no "watch" path | Strangers hit a signup wall in front of the best asset |
| Video | Non-direct (Bunny HLS) rows fall back to local demo MP4s of 1.8-4.8 MB | No adaptive bitrate on mobile data |
| Feed depth | Fixed 72, no pagination; static end card | Fine for now; revisit when catalogue grows |
| Explore | Static posters, no animated preview, though Bunny emits `preview.webp` | Lower tile-to-watch rate than achievable |
| Instrumentation | `watch_progress` defined but never fired | No retention curve, so no way to measure any of the above |

---

## 3. Shipped in this pass

1. **Captions on the muted clip.** `captionUrl` flows from `video_clips.caption_vtt_url` into
   `FeedPublication` and renders as a `<track kind="captions" default>` on `NativeClip`. The
   single highest-leverage change available.
2. **The sound choice persists.** Unmuting once is remembered across navigation and sessions
   (`localStorage`, read through the existing `useStoredValue` external-store hook).
3. **Lighter Feed route.** `CardChart` is now a `next/dynamic` import, so the chart engine
   loads when a reader swipes to a chart card rather than on every Feed open.
4. **Smaller first payload.** The Feed asks for 8 comments per publication instead of 30.
5. **Retention is now measurable.** `watch_progress` fires at the 25/50/75/95% quartiles so
   the drop-off curve exists per surface.
6. **Adaptive playback, and an account gate on watching.** See section 6.

## 4. Next, in order of expected return

1. **Animated Explore previews.** Bunny already emits `preview.webp`; wire it to the tile and
   play it for the tile in view on mobile (not hover, which phones do not have). Now the main
   thing a signed-out visitor can be shown, so it matters more than before.
2. **Resolution as the share moment.** When a call the reader watched resolves, that is the
   notification and the share prompt. Pre-filled text, native sheet, links to the sealed call.
3. **A real cold start.** Signed-out ranking currently falls back to global engagement plus
   recency. One question at first open ("which of these do you follow?") would populate
   `sectorInterests` and make the first session relevant.
4. **Day-7 return, honestly.** The `publication` notification already fans out to followers.
   Web Push (installed PWA only on iOS) plus a resolution notification is the return loop.
   No streaks, no artificial urgency.
5. **Feed depth.** Paginate past 72 when the catalogue justifies it.

---

## 6. The video pipeline, and who is allowed to watch

### 6.1 Adaptive playback is now the real path

Bunny stores HLS (`{cdn}/{guid}/playlist.m3u8`), which is adaptive by construction: the manifest
lists renditions and the player picks one per segment. That is exactly what a phone on a slow
connection needs. But `isDirectVideoUrl()` only recognized `.mp4`/`.webm`, so every real row was
treated as unplayable and swapped for a local demo MP4 of **1.8 to 4.8 MB with no bitrate
ladder**. The most expensive asset on the surface was also the least adaptive one.

Now:

- `isHlsUrl()` / `isPlayableVideoUrl()` recognize the manifest, so real rows play their own
  stream (`src/lib/video/direct.ts`).
- `NativeClip` attaches the stream itself. Safari and iOS play HLS natively and never download a
  library; everything else dynamically imports **hls.js** the first time an HLS clip plays, so it
  stays out of the Feed's initial payload (`src/lib/video/hls.ts`).
- Buffer is capped (12s target, 30s max) and `capLevelToPlayerSize` is on, so we do not pay for
  video the reader scrolls past or for renditions larger than the frame.
- **Fallback, not failure.** If the manifest is refused (pull-zone token auth or referer rules)
  or a file is dead, `onUnplayable` switches that publication to Bunny's own iframe, which
  authenticates itself. A misconfigured CDN degrades to a working player instead of a black
  rectangle.
- The demo swap survives as an explicit escape hatch: `STOA_DEMO_CLIPS=1` forces it for a
  walkthrough. It is no longer the default for real data.

**Operational note.** If clips still fall back to the iframe in production, the cause is Bunny
pull-zone configuration, not this code: token authentication or allowed-referer rules must permit
the app origin for direct manifest access. The iframe path will keep working either way.

Worth measuring next: time-to-first-frame from play intent to first rendered frame, against the
2-second cliff in section 1.2.

### 6.2 Watching requires an account

`/feed` redirects signed-out visitors to `/sign-in?next=/feed`, and the gate runs **before** any
ranking, clip listing or comment fetch, so a redirected visitor costs one auth check. Explore's
watch overlay follows the same rule, since it is the same player, and its pointerdown prefetch no
longer warms video for someone about to be redirected.

What stays open to strangers, deliberately:

| Surface | Open? | Why |
| --- | --- | --- |
| Explore wall | Yes | Posters are images. This is the catalogue and the reason to want an account. |
| Today, publication pages, analyst profiles | Yes | Text and posters. Paywalled bodies stay RLS-gated as before. |
| Root lead clip | Press to play | One clip, on intent. The root takes the most traffic, most of it crawlers. |
| Feed | No | Continuous streaming, the highest per-view cost in the product. |

`/feed` came out of `sitemap.ts` (a crawler would only ever see the sign-in page) and `/explore`
took its slot.

**The tradeoff, stated plainly.** Section 1.5 says gating the core experience costs conversion on
referred traffic. That is the price being paid for predictable bandwidth. The mitigations that
matter most, in order: animated Explore previews so the wall still sells the product, and
resolution sharing so a shared link lands on a sealed call rather than a signup form.

## 5. What we are deliberately not doing

Leaderboards, public scores, streaks, "X people are watching", artificial scarcity timers,
infinite autoplay with no end state, or any aggregate verdict across analysts. Some of these
are known to work on engagement metrics. They are banned here because they would make the
record less trustworthy, and the record is the product.
