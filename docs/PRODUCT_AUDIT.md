# Stoa product audit

Walked production (`https://www.stoamarket.ai`) as a signed-in analyst on 8 September 2026. Desktop 1440x900 and iPhone 390x844. Account: `marcus_webb@stoa.demo`. No code was changed.

This is a notes-and-plan document. Nothing here has been fixed yet.

## How this was done

Signed in, opened every core surface, liked a clip, posted comments on desktop and mobile, opened Discuss, Follow, Save, Share, walked Compose through Write / Call / Cards / Video / Tags / Publish, edited profile (bio saved, name reverted to Marcus Webb), opened Studio analytics, and checked the PWA shell.

What I could not finish end to end:

- A new publication did not go live. Publish is gated on fact-check credits, and the Video step's file input is hidden behind "Choose a video", which the walkthrough did not complete as a TUS upload to Bunny.
- Comment hearts are not buttons, so a comment cannot be liked. Clip like did work.
- Captions language in Compose was not reached, because the clip never left the empty stage.

Everything below is from the live site plus the code that serves it, not from fixtures.

---

## 1. Does everything work?

### What works

| Action | Result |
| --- | --- |
| Sign in (email) | Lands on Today. Google sign-in is also live (your account already has a Google identity). |
| Feed video | Native HLS. Desktop: 418x709, playing, muted. Mobile: 390x722, filling the stage between the 57px header and the tab bar. |
| Mute / pause | Present. `Unmute (M)`, `Pause (Space)`. |
| Like (the clip) | Works on desktop (after scrolling to the action row) and on mobile (overlay icons). |
| Discuss + comment | Works. Three audit comments posted and visible: "Walkthrough comment", "Mobile comment from the audit", "Desktop audit comment: thread check." Reply exists. |
| Explore wall | Loads a dense mosaic with tickers, LONG tags, durations, TRENDING tile. |
| Today, Markets, Search, Watchlist, Portfolio, Dashboard, Screener | Pages render. |
| Studio publications, track record | Live. Track record shows score 56, 60 HIT / 41 NEAR / 45 MISS, equity curve, Wilson / profit factor / alpha. |
| Profile save | Bio saved. UI showed "Saved" (and "Saving..." at the same time). |
| Offline page | Renders. |
| PWA install hint | Shows on mobile. |
| Cookie banner | Present. Essential / Accept. |

### Broken, blocked, or lying

1. **Landing activity line is dead.** Signed-out home prints `0 PUBLICATIONS TODAY · 0 ANALYSTS · 0 CALLS RESOLVED` while Feed holds 71 clips and Explore is full. "Today" is a calendar slice, so a quiet UTC day prints zeros on the front door. That reads as an empty product.

2. **Desktop Like / Discuss / Save / Share sit below the fold**, under a 9:16 card that is already ~709px tall, and the cookie banner covers the bottom. On a 900px-tall desktop window the social row is easy to miss entirely. The walkthrough's first pass concluded "no like button". The buttons exist. They are just not on the picture.

3. **Comment like is a decoration.** The heart next to a comment is a `<span>`, not a button. Count stays at 0. You can reply. You cannot like.

4. **Follow on the clip overlay is easy to miss in automation and easy to confuse with Following.** Audience shows 24.8k followers. Following page shows **Creators (0)**. Those are different lists, but the empty Following page after a session on Feed feels broken.

5. **HEALTHCARE on a car-fridge clip.** The live lead is Bar Amsalem, Hebrew, "I bought a 20 litre fridge for the car", tagged HEALTHCARE. That is a placement / tagging fault, not a player fault.

6. **Compose will not publish without fact-check.** Step 6 says "Required before publishing. Claims are classified and checked against live market data." The top-right Publish button is still visible from step 1, so the page offers a door it then refuses.

7. **Video upload is a hidden file input.** The Video step shows an empty stage ("NO VIDEO LOADED. THE STAGE RUNS A 1:30 CLOCK") and a "Choose a video" control. Until that click, there is no obvious drop zone of the kind TikTok/IG use. Captions, trim, and thumbnail never appear until a file is actually in.

8. **Money and growth are stubs.**
   - Earnings: $0 everywhere, "PAYOUTS ON HOLD, CONNECT PAYPAL", button present but disabled in code.
   - Audience: "Subscriber growth over time, not stored yet." Em dash in the live copy.
   - Studio list: unlocks and revenue are placeholders.
   - Boost: packages and Buy are not wired.
   - Settings: Change password and Deactivate are disabled.
   - Wallet: Connect PayPal disabled.

9. **Several routes share the marketing document title** (`Stoa - Think clearly. Invest better.`) instead of their own: Watchlist, Portfolio, Dashboard, Screener, Notebook. They loaded, but they do not feel like named surfaces.

10. **SMTP is still the built-in mailer.** Autoconfirm is on, so signup works. Password reset still cannot send mail.

### Verdict

The watch path works. Social write (comment, clip like) works if you can find the control. The post path is a research studio with a fact-check gate, not a clip uploader, and it did not complete a live publish in this pass. Analytics that matter for a creator (track record) work. Analytics that matter for money (earnings, audience growth, boost) do not.

---

## 2. Design vs social-network rules

Stoa's brief is ledger-and-seal, not TikTok chrome. That is the right brand. The Feed still has to obey the unwritten rules of a vertical video product, because that is how people have learned to use a phone.

### Where it matches the brief

- Paper / ink, Fraunces for display, IBM Plex for UI, no neon, no drop-shadow cards.
- Seal language on HIT/MISS in Studio publications.
- Primary actions are solid ink, not green.
- Explore is a catalogue wall, not a second Feed. Correct.

### Where it fights the social-network grammar people already have

| Expectation (IG / TikTok / Shorts) | Stoa today |
| --- | --- |
| Hearts, comments, share on the **picture**, thumb-reach | On mobile, yes (bottom of the clip). On desktop, a text row **under** the card, often off-screen. |
| One tap to like | Desktop: scroll first. |
| Full-bleed video | Mobile: close. Desktop: a postage-stamp 9:16 card in a sea of paper. |
| Creator identity + Follow on the clip | Present. |
| Captions on by default, muted | Mute is on. Hebrew captions rendered on the live clip. Good. |
| Double-tap like | Not present. |
| Share sheet native | Copy / Share exists. Desktop shows "Copied" pattern. |
| Cookie + install banners stacking on the clip | Cookie on desktop Feed. Install banner on mobile Feed **and** Compose. The clip's action icons sit directly above the install hint. |
| No legal banner on the first watch | Cookie bar is on the first Feed frame. |

Desktop Feed is a magazine that happens to contain a Reel. Mobile Feed is much closer to the grammar. If the product is "video-first", desktop is the surface that currently looks unfinished, not mobile.

Other design faults seen live:

- **HEALTHCARE** is printed twice on the same clip (dateline and overlay chip).
- Dateline `1 / 71` is product-internal. Viewers do not need a queue index.
- Compose stepper prints `4 VIDEO` after `3 CARDS` with a missing visual "2" in some states, and locks later steps until Write is filled. Fine for a wizard, hostile for "I have a clip".
- Template picker ("Initiating coverage, 8 sections") appears on step 1 of a video product. That is Seeking Alpha, not a short.
- Audience / Earnings copy uses an em dash, which the design rules forbid.

---

## 3. Is the mobile app working?

Treat "mobile app" as the PWA, not a native binary.

### What is working

- Bottom tabs: Feed / Today / Explore / Markets. They sit at y=780 in a 844px iPhone frame, 54px tall, labels visible.
- Feed video is 390x722 starting at y=57. That is a real full-stage player, not a desktop page squeezed.
- Like, Discuss, comment post, Explore masonry, Compose (cramped but opens), Studio (READING / PUBLISHING / ACCOUNT collapse), Settings, Offline.
- Install hint: "Add Stoa to your Home Screen: tap Share, then Add to Home Screen." Correct copy for iOS Safari. Manifest is reachable.
- Safe areas: video does not sit under the home indicator. Tabs include bottom inset.

### What is not a mobile app yet

1. **Compose on a phone is a 6-step research wizard.** Step tabs overflow (`4 VIDE...`). Templates, fact-check, and a toolbox that does not even fit. Nobody records a Reel this way.
2. **Install prompt fights the Feed.** It sits on top of the tab bar region and the action icons. First-run watch is "dismiss the cookie, dismiss install, then watch".
3. **Desktop chrome leaked onto the phone.** Search, Compose pencil, inbox, avatar all remain in the top bar, so the screen has a top nav **and** a tab bar. Instagram puts create in the tabs. TikTok puts it in the tabs. Stoa puts it in the header and keeps four reader tabs below.
4. **Studio on mobile is a squeezed desktop sidebar.** READING / PUBLISHING / ACCOUNT as dropdowns. Usable, not app-like.
5. **PWA is shell-only.** The service worker caches `/offline` and `/_next/static`. It does not cache the app shell HTML. Offline page is honest ("Stoa needs a connection"). That is acceptable for video. It is not an app you can open on the train without signal.
6. **No standalone-specific hide of browser install banners once installed.** Worth checking after Add to Home Screen; not verified on a physical phone in this pass.

### Verdict

As a **viewer**, the phone Feed is the best surface in the product. As a **creator**, the phone is not an app, it is the desktop studio in a 390px column. As a **PWA**, install and offline exist, and that is the right first slice, not a finished home-screen app.

---

## 4. What can be faster

Measured TTFB on production, signed-in, cold-ish navigations:

| Route | Time to document |
| --- | --- |
| Landing | 5.1s |
| Feed | 6.9s |
| Today | 5.3s |
| Explore | 3.5s |
| Following | 7.0s |
| Saved | 6.4s |
| Audience | 6.4s |
| Compose | 2.7s |

Those are not "feels instant" numbers. Instagram and TikTok hide this behind cached shells and a player that is already warm.

### Highest-leverage speed work (from the live pages and the code)

1. **Stop sending transcripts and fact-check JSON in the Feed/Explore card query.** `listVideoClipCards` selects `transcript`, `fact_check_results`, and `reports(*)`. The player never shows a transcript. High.
2. **Stop shipping every clip's comments in the first HTML.** Feed loads comment previews for the whole list. Comments should load when Discuss opens. The walkthrough's discussion sheet worked with a round trip. High.
3. **`(app)` layout is `force-dynamic`.** Explore could be cached for signed-out. Feed must stay dynamic. Split the layout. Medium-high.
4. **Explore imports the entire Feed player** (`FeedSurface`) before anyone taps Watch. Dynamic-import it. High.
5. **Compose statically imports TipTap, VideoRung, cards, AI, promote, fact-check.** `/studio/compose` is 1778 lines in `studio-editor.tsx` plus 1432 in `video-rung.tsx`. Lazy-load by step. High.
6. **Three live `<video>` / HLS instances** (active ±1). Right for start latency, expensive on mid phones. Consider poster for neighbors. Medium.
7. **Feed asks for 72 cards.** Cap nearer 24 to 36 and append. Medium.

Already good, do not undo: `hls.js` is lazy; iPhone uses native HLS; Feed charts are `next/dynamic`; landing lead is click-to-play; SW correctly bypasses Bunny.

---

## 5. Front-end fixes (bugs and polish)

P0, user-visible:

1. Landing zeros. Show a rolling window or hide the line when all three are 0.
2. Desktop Feed: put Like / Discuss / Save / Share on the card, or shrink the card so the row is visible without scroll. Dismiss or slim the cookie bar on authenticated Feed.
3. Comment like: make the heart a button, or remove the count.
4. Tagging: the fridge clip must not be HEALTHCARE. Check how theme tags are assigned on publish.
5. Duplicate HEALTHCARE chip.
6. Fact-check copy vs the always-visible Publish button. Either hide Publish until the gate is passed, or allow a NOTE with no fact-check.
7. Settings: "Saving..." and "Saved" at once.
8. Strip em dashes from Audience and Earnings.
9. Per-route `<title>` for Watchlist, Portfolio, Dashboard, Screener, Notebook.
10. Following empty state should not look like a broken social graph when the account has 24.8k followers. Say "You are not following anyone yet" is fine; the zero on every tab including tickers needs a one-tap Discover.

P1, quality:

11. Cookie + install stacking. One chrome interruption at a time.
12. `1 / 71` queue index: hide on consumer Feed.
13. Explore watch overlay: confirm signed-in play (not re-tested as a tap on a tile in the last pass).
14. Hebrew / RTL: comments and captions work; the Discuss header stays LTR while the title is Hebrew. Acceptable, but the close target and input should stay thumb-reachable in RTL.
15. Install hint on desktop Feed ("Install Stoa for full-screen video") is the right idea. Do not also cover the action row.

---

## 6. What can be simpler

The product is trying to be four products on one URL:

1. A short-video network (Feed, Explore).
2. A research publisher (Compose thesis, templates, valuation, fact-check).
3. A brokerage terminal (Markets, screener, portfolio, dashboard).
4. A creator SaaS (wallet, boost, PayPal, audience).

Instagram did not ship Ads Manager inside Reels. YouTube did not ship Premiere Pro inside Shorts. The lock-and-seal call is the one extra Stoa must keep. Almost everything else in Compose can wait until after the first clip is live.

### Compose, specifically

Today's default path:

Write (headline, dek, templates, slash menu with 20 blocks) → Call → Cards → Video → Edit video → Tags → Publish (access, boost, disclosures, fact-check).

What a professional short-video product does:

Film or upload → trim → caption → cover → post.

Recommended default for Stoa Video / NOTE:

1. Video (record or upload, trim, captions, cover).
2. Title (one line) + tags.
3. Optional: "Add a call" / "Add a thesis" / "Add cards".
4. Publish (disclosures only if there is a call).

Park templates, slash-menu data nodes, AI credits, and fact-check behind Research mode. A NOTE with a 12s clip should not mention "Initiating coverage (8 sections)".

### Chrome

- One create entry: the pencil. Not also "New publication", not also a rocket Publish on step 1.
- Phone: put Create in the tab bar, or replace Markets with Create and leave Markets in the header.
- Studio sidebar: 12 links. Group money (Earnings, Wallet, Boost) behind "Money" until PayPal is live, so creators are not walking into disabled buttons.

---

## 7. What you would expect if this were Instagram, TikTok, or YouTube

A professional take, not a request to copy their brand.

### Watching (this is the comparison that matters)

TikTok / Reels / Shorts agree on:

- Full-bleed vertical video.
- Sound off until the viewer asks.
- Captions on.
- Identity, Follow, Like, Comment, Share on the frame.
- The next clip is already decoding.
- No cookie banner on the clip after the first session.

Stoa mobile Feed is in that family. Desktop Feed is not. If an investor sits at a desk, they currently get a column of white paper and a small film. YouTube solved desk watching with a large player and a conversation column. Stoa's Discuss sheet on desktop is the right idea (and it worked). The player should grow to meet it, not sit in a 420px well.

### Posting

TikTok: camera first. Instagram: camera or gallery, then stickers. YouTube Shorts: camera, then a short details screen. YouTube Studio (long form): a real uploader with title, description, visibility, kids, monetization.

Stoa Compose is YouTube Studio for a 12-second clip. That is the mismatch. The locked call, disclosures, and evidence cards are your differentiator. They should appear when the publication is a CALL or RESEARCH, not as steps 2 and 3 of every post.

Fact-check before a NOTE is the Seeking Alpha quality gate bolted onto a Reel. Keep it for RESEARCH. Do not require it to ship a 12s comment on a fridge.

### Analytics

YouTube Studio: views, watch time, traffic sources, revenue, with "this is still processing" honesty.

Stoa Track record is actually more interesting than YouTube's for this product: HIT / MISS / NEAR and an equity curve. That page is good. Audience "not stored yet" and Earnings "connect PayPal" (disabled) are worse than an empty YouTube Studio, because they look like dashboards and then say the data was never built. Hide them, or show a single "Payouts are not on yet" page, until the pipeline is real.

### Identity

Instagram: one profile, grid, reels, tagged. YouTube: channel + studio.

Stoa has a public analyst page, a private `/profile`, Settings, Storefront, Branding. That is too many rooms to change a bio. Settings saved, which is enough. Storefront can stay for paid theme. Do not also ask a creator to find Branding.

---

## Ranked plan to fix all of this

Do not start all of it at once. Order is what a viewer hits, then what a creator hits, then speed, then money.

### Slice A. Make watching feel finished

1. Move desktop Like / Discuss / Save / Share onto the clip (same overlay as mobile) or shorten the card so the row is on-screen.
2. One interruption: cookie once, install once, never both on the first clip.
3. Hide `1 / 71`. Keep one HEALTHCARE, not two.
4. Landing: do not print three zeros. Use 7-day counts or omit the line.
5. Comment heart becomes a real like, or the count goes away.

### Slice B. Make posting a 12-second clip possible on a phone

6. Video-first Compose for Video / NOTE: video → title/tags → publish. Call, cards, thesis are optional drawers.
7. Visible drop zone / "Choose a video" / Record as the first screen, not step 4 of 6.
8. Captions: request the language the creator is speaking (Hebrew was the live case). Do not write a caption URL when Bunny has `captions: []`.
9. Fact-check required only for RESEARCH, or for publications that make factual claims in a thesis. A NOTE publishes without a 3-credit gate.
10. Hide the top-right Publish until the current step's gate is satisfied, so the button does not lie.

### Slice C. Speed

11. Slim `CARD_SELECT` (no transcript, no fact-check blob, no `reports(*)`).
12. Fetch comments on Discuss open, not for 72 publications up front.
13. `dynamic()` the Feed player from Explore.
14. Code-split Compose by step.
15. Drop Feed list from 72 to ~30 + append.
16. Consider splitting `(app)` so Explore can cache.

### Slice D. Honesty in Studio

17. Until PayPal is live: one "Payouts" page that says so. Remove disabled Connect buttons from Earnings, Wallet, Subscriptions, Boost buy.
18. Hide Audience growth chart until it has data. Keep subscribers / followers / referral link.
19. Studio table: drop Unlocks and Revenue columns until they are real.
20. Settings: hide Change password until SMTP can send a reset.

### Slice E. Mobile app (PWA, second pass)

21. After install, hide the install banner.
22. Create in the tab bar (or a center action), not only a header pencil.
23. Compose phone layout: one column, no toolbox, no 6-step overflow tabs.
24. Leave the SW as a video-bypass shell. Do not cache HLS.

### Slice F. Later, not now

- Double-tap like.
- Neighbor-clip poster instead of three decoders, if mid-range Android stutters.
- RTL Discuss chrome.
- Password reset (needs SMTP).
- Why two Sep 1 uploads died in the browser (already diagnosed separately: zero bytes to Bunny).

---

## Suggested sequence of PRs

1. **Watch chrome:** desktop actions on the clip, cookie/install stacking, landing zeros, comment like, duplicate tag. Small, visible, no schema.
2. **Feed payload:** slim card select, lazy comments, Explore code-split. Speed, no UI redesign.
3. **Compose default path:** video-first NOTE/Video, fact-check scoped, visible uploader. Largest product change. Do this before asking anyone else to publish.
4. **Studio honesty:** hide stubs. Track record stays.
5. **PWA tab Create + post-install hide.**

Until slice 3 lands, do not spend design time on Boost packages or Audience charts. The product is unusable as a publisher for a 12s clip, and already usable as a viewer on a phone.
