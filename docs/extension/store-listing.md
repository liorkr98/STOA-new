# Chrome Web Store listing: Stoa Interest Cart

Prepared 28 Oct 2026 on `feat/interest-cart-extension`. **Nothing has been submitted.** The
privacy answers below need the same legal review as `/legal/extension-privacy`.

## The package

| | |
|---|---|
| Name | Stoa Interest Cart |
| Version | 0.1.0 |
| Build | `cd extension && npm run zip:store` writes `extension/.output-store/stoa-extension-0.1.0-chrome.zip` |
| Talks to | `https://www.stoamarket.ai` only |
| Icons | `extension/public/icon/16.png`, `32.png`, `48.png`, `128.png` (in the package); `extension/store-assets/icon-128.png` (listing icon, art 96 x 96 on a 128 canvas); `extension/store-assets/promo-440x280.png` (small promo tile). Drawn by `extension/scripts/icons.mjs` from Stoa's colonnade mark. |

The store build leaves out the manifest's `key` (the store refuses one) and so gets its own
extension id from Google. Before release, add that id to `NEXT_PUBLIC_STOA_EXTENSION_IDS` in
Vercel, or the site will not hand it a sign-in or accept its requests. The store build also
only lets `stoamarket.ai` pages talk to it (`externally_connectable`), never `localhost`.

The production site must have the extension routes deployed (this branch merged) and
`ANTHROPIC_API_KEY` and `DETECT_DAILY_BUDGET_USD` set before the store copy can work.

## Name and descriptions

"YouTube" appears only as "works with YouTube", never in the name.

**Short description** (the manifest's, 132 characters at most; this is 116):

> Spot the stocks a finance video discusses and tap a bull or a bear into your Stoa Interest Cart. Works with YouTube.

**Full description:**

> Watching finance videos and losing track of the stocks they mention? Stoa Interest Cart keeps
> the list for you.
>
> When a stock gets real airtime in the video you are watching, a small Stoa card slides in
> beside the video, never over it: the ticker, what the company does, its live price and
> today's move. Tap the bull if it interests you, the bear if it worries you. Each tap lands in
> your Interest Cart on Stoa, with the video and the moment, so at the end of the week you can
> see which stocks actually held your attention.
>
> - Only stocks that are really discussed: passing mentions, earnings calendars, portfolio
>   read-outs and sponsor plugs are left out. Quick picks join a quiet "In this video" line.
> - More info opens a short panel: a three-month price line, two sentences on the company, market
>   cap, P/E, 52-week range, next earnings, and how many Stoa analysts cover it. The video keeps
>   playing.
> - Quiet mode shows only the "In this video" line, with no pop-ups (Alt+Shift+Q).
> - Nothing in fullscreen. One card at a time. It folds away on its own.
> - Works with YouTube, in English and Hebrew.
>
> Privacy: it works only on youtube.com video pages, and only after you agree on its first
> screen. It reads the captions of the video you are watching to find the stocks. Stoa receives
> the captions text and the video's id, never your browsing history. You can switch it off from
> its toolbar popup at any time. Details: https://www.stoamarket.ai/legal/extension-privacy
>
> Taps are saved to your Stoa account; you sign in on stoamarket.ai as usual. Not investment
> advice.

**Category:** Productivity. (Alternative: Tools. "News & Weather" and "Shopping" do not fit.)
**Language:** English.

## Single purpose (store form)

> Shows the stocks discussed in the YouTube video the user is watching and lets the user save
> a bull or bear interest in each to their Stoa Interest Cart.

## Permissions, and why each is needed

| Manifest entry | What it allows | Why |
|---|---|---|
| `storage` | The extension's own storage on the user's computer | Keeps the user's Stoa sign-in, taps made while signed out until they are saved, this week's counts for the card, Quiet mode and the on/off switch, and the date the user agreed. |
| Host: `*://www.youtube.com/*` | Run on YouTube pages | To draw the card beside the video, follow the playback time so the card appears when a stock is discussed, and read the captions of the video being watched from YouTube's own transcript panel. It runs on no other site. |
| `externally_connectable`: `https://www.stoamarket.ai/*`, `https://stoamarket.ai/*` | Lets Stoa's own pages message the extension | So the user's sign-in on stoamarket.ai can be handed to the extension, and taps can be carried into the user's cart. No other site can message it. (Not a permission; the store asks about it anyway.) |
| `web_accessible_resources`: `fonts/*.woff2` on YouTube | YouTube pages may load the extension's font files | The card is drawn in Stoa's typefaces. Only the font files are exposed. |
| `commands` | Keyboard shortcuts | Alt+Shift+Q toggles Quiet mode, Alt+Shift+S opens the popup. (No permission needed.) |

Not requested: `tabs`, `scripting`, `activeTab`, `history`, `cookies`, `webRequest`, `<all_urls>`
or any Stoa host permission (Stoa's API admits the extension by its origin, CORS).

**Remote code:** No. All code is in the package. The extension only fetches data (JSON) from
Stoa's API.

## Data-use disclosure (the "Privacy practices" tab)

What the form asks, and the answers that match what the code does today.

**Does the item collect or use any of the following?**

| Category | Answer | What, exactly |
|---|---|---|
| Personally identifiable information | **Yes** | The user's email address arrives with the Stoa sign-in and is shown in the popup ("Saving to Stoa as …"). It is not sent anywhere by the extension. |
| Health information | No | |
| Financial and payment information | No | Taps express interest in a stock; no account numbers, holdings or payments. |
| Authentication information | **Yes** | The extension's own Stoa session (access and refresh tokens), kept in extension storage and sent only to stoamarket.ai. |
| Personal communications | No | |
| Location | No | |
| Web history | **Yes, to be safe (legal to confirm)** | For each YouTube video page opened, its video id is sent to Stoa to look up stocks; when the user is signed in and Stoa has not seen the video, the id goes with the user's sign-in. Taps carry the video id, channel and second. Nothing about any other page or site. |
| User activity | **Yes** | Taps (ticker, bull or bear, and the video they came from: id, title, channel, moment), shown back only to the user in their cart. Playback time is read in the browser and never sent, except as the moment of a tap. |
| Website content | **Yes** | The captions text of the video being watched, sent to Stoa once per video so the stocks can be found. |

**Certifications** (all three can be ticked as the code stands):

- I do not sell or transfer user data to third parties, outside of the approved use cases.
  *Note for legal:* captions (public video content, no user data) are sent by Stoa's server to
  Anthropic to find the companies. That is part of providing the single purpose.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://www.stoamarket.ai/legal/extension-privacy` (currently a DRAFT
pending legal review; it must be final and live before submitting).

**Open question for legal:** the consent screen promises "never your browsing history", and
the store form's "Web history" above is answered Yes because video ids of the YouTube videos the
user opens reach Stoa. The two are compatible only if "browsing history" is read as "other
sites and what else you watch", which is how the consent screen and the privacy page word it.
Counsel should confirm the wording, or the product should stop sending the video id with the
user's sign-in on a first read.

## Screenshots

The store takes 1 to 5 screenshots at 1280 x 800 (or 640 x 400). Taken from Bar's Chrome at
1280 x 800, files in `extension/store-assets/screenshots/`:

1. `1-card.png`: the card beside a playing video, mid-discussion.
2. `2-tapped.png`: right after a bull tap, "added · interested" with Undo.
3. `3-more-info.png`: the More info panel over the page.
4. `4-in-this-video.png`: the "In this video" line after a run of quick picks.
5. `5-consent.png`: the first-run screen.

These were taken on Bar's Chrome, where YouTube is in Hebrew (`1-card` to `4-in-this-video`), and
the consent screen in a test browser from the same build. For an English listing, retake 1 to 4
on English YouTube (YouTube's own menus and titles would then read in English); the Stoa card
itself is identical.

Optional: the popup (it renders at 360 px wide, so it goes inside a 1280 x 800 frame), and the
small promo tile `store-assets/promo-440x280.png`.
