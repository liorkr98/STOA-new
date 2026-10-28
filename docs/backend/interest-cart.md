# Interest Cart: backend spec

For Krisi. Written 2026-10-13 with the first cart build (branch `feat/interest-cart`).
The draft migration is `supabase/migrations/0068_interest_taps.sql`, headed
**DRAFT - DO NOT APPLY**. Nothing has been run against the live database.

## What the cart is

A reader taps a bull or a bear beside a ticker. Each tap lands in that reader's cart for the
week. At the end of the week the cart shows which tickers actually held their attention. The
Stoa Chrome extension (`extension/`, built 2026-10-28) spots tickers discussed in YouTube
finance videos and sends taps from there too: see "The YouTube extension" below.

Product rules the backend must keep:

- A tap is `bull` or `bear`. There is no neutral tap. One tap is one count.
- Bull and bear are counted and stored separately. **Nothing returns a net figure or a sign.**
- The cart resets weekly. A week starts Monday 00:00 in the reader's own time zone.
- Older weeks stay readable.
- Saving needs an account. A signed-out tap is held on the device and replayed after sign-up.
- Every tap records its source: `site` or `extension`. Extension taps also carry the video id,
  the channel and the moment in the video.

## What exists today (temporary)

The app runs the whole cart against one interface, `InterestCartStore`
(`src/lib/interest-cart/store.ts`). Its only implementation today is
`TemporaryLocalCartStore`, which keeps taps in the browser's localStorage, keyed by user id.
Taps made today do not follow a reader to another device and are not carried into the table.

Swapping in Supabase means writing one class, `SupabaseCartStore`, with the same six methods,
and changing the one line in `cartStore()`. No component changes:

| Interface method | Supabase call |
|---|---|
| `insert(tap)` | `insert` into `interest_taps` with `onConflict: "id"`, `ignoreDuplicates: true`; `inserted` = a row came back |
| `removeLatest(userId, ticker, removal)` | `rpc("interest_cart_undo_tap", { p_ticker })`: the tap toast's Undo, a soft removal |
| `removeTicker(userId, ticker, from, to, removal)` | `rpc("interest_cart_remove_ticker", { p_ticker, p_from, p_to })` |
| `restore(userId, removalId)` | `rpc("interest_cart_restore", { p_removal_id })` |
| `listBetween(userId, from, to)` | `rpc("interest_cart_week", { p_from, p_to })` (counted taps only) |
| `listWeekKeys(userId, startsOn)` | `rpc("interest_cart_weeks", { p_time_zone, p_week_starts_on })` (counted taps only) |

The browser's `removal.id` is not sent: the database makes the removal id and returns it.

The browser passes its IANA zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

All of this goes through `src/lib/db/*` like every other Supabase call.

## The table: `interest_taps`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, primary key | Made on the device. A held tap replays under the same id, so a replay that runs twice (a reload mid-flow, two tabs) inserts once. |
| `user_id` | uuid, not null, default `auth.uid()` | References `profiles`, cascades on account deletion. |
| `ticker` | text, not null | Uppercase symbol, same pattern the app validates. |
| `direction` | text, not null | `bull` or `bear`. |
| `source` | text, not null | `site` or `extension`. |
| `video_id` | text, null | Extension only. |
| `video_channel` | text, null | Extension only. |
| `video_seconds` | integer, null | Extension only: seconds into the video when tapped. |
| `created_at` | timestamptz, not null | UTC, **stamped by a trigger**. A client cannot backdate a tap into an earlier week. |
| `removed_at` | timestamptz, null | Soft delete. Null while the tap counts. Stamped by the database, never the client. |
| `removal_id` | uuid, null | Taps removed together (a ticker's whole week) share one id; Undo restores exactly them. |
| `removed_reason` | text, null | `undo` (the tap toast's Undo) or `remove` (the reader took the ticker out of the week). |

A check constraint keeps the three video columns null unless `source = 'extension'`, and another
keeps the three removal columns all set or all null.

## Removing a ticker: soft delete, never hard delete

A reader can take a ticker out of the **current** week from the cart panel: every tap on it,
both sides, in one go, with Undo on the toast. Bar's rule (2026-10-26): **rows are never
deleted.** A removal marks the taps (`removed_at`, `removal_id`, `removed_reason`) and keeps
them, because:

- **Undo needs them.** Undo clears the marks on exactly the taps of that removal, so the row
  comes back with the same bull and bear counts.
- **Any all-readers weekly total must exclude removed taps without losing the fact that a tap
  happened.** Counts read `where removed_at is null`; the rows stay for anything that later needs
  to know a tap was made and withdrawn.
- **Deleting rows outright makes the numbers dishonest later.**

Rules the database enforces, not only the panel:

- **Only the current week.** `interest_cart_remove_ticker(p_ticker, p_from, p_to)` refuses unless
  `now()` falls inside `[p_from, p_to)` and the range is at most 8 days (a week, with room for a
  clock change). A closed week is a record.
- **Restore only soon after.** `interest_cart_restore(p_removal_id)` restores only a removal made
  in the last hour (Undo lives on a toast), so a closed week cannot be edited by restoring later.
- **Removing does not block.** Tapping the ticker again the same week inserts a new, counted tap:
  a fresh count. The removed taps stay removed.
- **No editing.** A tap's direction, ticker and time can never change: a trigger allows an update
  to touch only the three removal columns, and stamps `removed_at` itself. Changing one's mind is
  a tap on the other side, which the cart shows as 1 bull / 1 bear on purpose.
- **The tap toast's Undo is a soft removal too** (`interest_cart_undo_tap`, reason `undo`): the
  newest counted tap on that ticker stops counting and is kept.
- There is still **no `delete` privilege** for anyone but the service role. Account deletion
  cascades from `profiles` as before.

## Row-level security

A person only ever reads their own taps. This is enforced in the database, not in the component:

- `select`, `insert` and `update` policies all require `user_id = auth.uid()`. There is no
  `delete` policy or grant: nobody deletes a tap through the API.
- `update` is granted on the three removal columns only, and a trigger refuses any update that
  touches another column. In practice the app only updates through the three removal functions.
- `anon` has no access at all.
- Both aggregate functions are `security invoker` (RLS still applies). They also filter on
  `auth.uid()` in their own `where`, so they cannot return another person's rows even if
  someone later adds a broader policy.

Worth adding to `tests/rls/rls.test.ts` once applied: user A inserts, user B selects and gets
nothing; B cannot remove or restore A's taps; nobody can delete a tap or change its ticker,
direction or time; removing a ticker in a past week is refused; anon selects nothing.

## Indexes

- **`(user_id, created_at desc)`: the one that makes "this user, this week" cheap.** Every
  cart read is an equality on `user_id` plus a range on `created_at` (the week's UTC bounds).
  This index serves that read, the week list and the nav badge count without touching any
  other user's rows.
- `(user_id, ticker, created_at desc)`: the tap's Undo (newest counted tap on a ticker) and
  removing a ticker from the week.
- `(removal_id) where removal_id is not null`: restoring one removal.
- The primary key on `id` makes the idempotent replay a cheap conflict check.

## The weekly per-user aggregate

A plain view cannot take the reader's time zone, and a week is a *local* week, so the
aggregate ships as two security-invoker SQL functions, which behave like parameterised views:

Both count only taps that have not been removed (`removed_at is null`).

- `interest_cart_week(p_from, p_to)` returns `ticker, bull, bear, total` for the caller,
  most-tapped first. The app computes `p_from` / `p_to` from the reader's local Monday
  midnights, so a week that crosses a clock change is still exactly that week.
- `interest_cart_weeks(p_time_zone, p_week_starts_on)` returns each week the caller tapped in,
  with its ticker and tap counts, newest first.

Neither returns a net figure.

## The future anonymised cross-user total

Not built and not in the migration, but its shape is drafted there, commented out, so it gets
reviewed with the table: `interest_cart_global_weekly`, a materialized view of `week_start,
ticker, bull, bear, people`.

- It counts only taps that have not been removed (`where removed_at is null`); the removed rows
  stay in the table.
- It holds no user ids.
- It drops any ticker fewer than 10 distinct people tapped that week, so a rare ticker cannot
  point at one person.
- It is read through a server route with the service key, never granted to `anon` or
  `authenticated` directly.
- It is refreshed hourly with `refresh materialized view concurrently`.
- It needs one fixed time zone for "the week". The draft uses `Asia/Jerusalem` (the Israel-first
  launch). Decide this before building.

## The four cross-cutting concerns

### Scalability

- Roughly: 10,000 weekly readers × 50 taps is 500,000 rows a week, about 26 million a year.
  The table is narrow (around 100 bytes a row before the extension fields), and every read
  hits the user-time index, so the per-reader cost stays flat as the table grows.
- When it passes about 50 million rows, partition by month on `created_at`. The primary key
  then needs `created_at` in it, so decide before the extension ships at volume.
- Retention is not decided. Raw taps older than 2 years could roll up into the weekly counts.
  This is Bar's call, since older weeks are meant to stay viewable.
- Rate limit inserts with the existing `check_rate_limit` RPC (for example 120 taps a minute
  per user). The extension is the likely source of runaway writes.

### Caching: never a stale count after a tap

- **Today:** there is no server cache. The count lives in the browser, is bumped on screen
  the moment of the tap, and is re-read from the store straight after.
- **With Supabase:** the cart and the nav badge read through the reader's own session with
  RLS, client-side, **uncached**. The tap bumps the count on screen at once, then the week is
  re-read after the insert resolves. Nothing personal goes through `cachedPage` /
  `unstable_cache` or a CDN.
- **If a server-rendered cart read is ever added** (for example the badge in the server nav),
  cache it under the key `interest-cart:{user_id}:{week_start}` with the tag
  `interest-cart:{user_id}`. The `addTap` and `undoLastTap` server actions call
  `revalidateTag("interest-cart:{user_id}")` **after the insert or delete commits and before
  the action returns**, so the next read on any page is fresh. Never a time-based expiry
  alone.
- The cart rows' company names and "Price this week" come from market data
  (`cartTickerInfo`, daily bars already cached per symbol). That cache is about prices, not
  taps, and may be minutes old without harm.

### Rendering

- The cart is a client overlay (`<CartPanel>`), not a route, and never server-rendered. It is
  personal and it must not land in a shared HTML cache.
- The tap controls render on server-rendered pages as client islands. Their counts arrive
  after hydration, so the first paint never carries a reader's data.
- The panel reads one week at a time: `interest_cart_week` for the shown week, and
  `interest_cart_weeks` for the switcher.

### Regionality

- Store in UTC, bucket in the reader's local time when reading. A reader who travels keeps one
  cart. Their week follows the clock on their device.
- Keep the Vercel functions that call the cart RPCs in the same region as the Supabase
  project. The cart reads on every panel open.
- Taps say which stocks a person is interested in, which is personal financial data under
  GDPR and Israel's Privacy Protection Law. Account deletion cascades the rows, and the data
  export (when built) should include them. Counsel should know the extension will add viewing
  context (video and channel).

## The week boundary

- **Storage:** `created_at` in UTC, set by the server.
- **Bucketing:** at read time, in the reader's zone. The app's rule is one constant,
  `WEEK_STARTS_ON` in `src/lib/interest-cart/week.ts` (Monday today). The SQL functions take
  the same value as `p_week_starts_on`.
- **If Stoa moves to a Sunday week for TASE:**
  - Change `WEEK_STARTS_ON` to `0`. Nothing stored changes, no migration, no backfill, because
    every week is computed when it is read.
  - The panel's "resets Monday" becomes "resets Sunday", and the week switcher's ranges
    shift by a day.
  - **Old weeks re-bucket:** a tap made on a Sunday moves from the end of one week to the start
    of the next, so a past week's totals can change. Tell readers when it happens.
  - The future global total must use the same start day and its fixed zone. Rebuild it with
    the new rule.
  - The trading week (Sunday to Thursday) and the cart week (seven days) are different things.
    The cart counts every day.

## Ticker and sector follows

`follows_instruments` (migration 0052) already holds server-side ticker, ETF, sector and theme
follows. The cart deliberately does not use it: a follow is a standing choice, a tap is a
moment of attention. Merging them would make a follow look like a view.

## The YouTube extension (2026-10-28)

The extension lives in `extension/` (WXT, Manifest V3, permissions: the YouTube host and
`storage` only). On a YouTube watch page it reads the transcript inside the reader's own browser,
asks Stoa which stocks the video discusses, and slides a card in beside the video at that
moment with a bull and a bear. Its id is pinned by a public key in its manifest:
`aobmhpgimghcngjppdbcglejomfgioan` (`src/lib/extension/id.ts`).

### Why the transcript is read in the browser

From a server, YouTube refuses captions (cloud addresses are blocked, and caption files come back
empty without a browser token). In the reader's browser, the extension first tries the request
YouTube's own transcript panel makes. YouTube now attaches a token from its own anti-abuse check
to that request and answers 400 without it; that token is YouTube's to make, not ours, so the
extension does not try to produce it. It falls back to opening the transcript panel out of sight
(see-through, under the page, unclickable) for the second it takes to load, reads its lines, and
closes it. Only the timestamped lines go to Stoa, once per video.

### Routes

All extension routes answer CORS for the extension's origin only, and refuse others.

| Route | Who calls it | What it does |
|---|---|---|
| `GET /api/extension/detect?videoId=` | extension | The stored result for a video, or `items: null`. Asked first, so a video already read never has its transcript read again. 240/hour per address. |
| `POST /api/extension/detect` | extension | `{ videoId, language, segments }`. Claude Haiku (`claude-haiku-5-5`, key `ANTHROPIC_API_KEY`, server only) returns which companies are discussed, when, the speaker's own stance, any explicit rating and whether it is conditional, as structured JSON. It never supplies a ticker: code maps the company to one through the symbol list (`tickers`, read in pages) and an alias table (`src/lib/extension/detect/aliases.ts`, which also lists the common ETFs the symbol list lacks). Then the rules (`rules.ts`): a card for 45+ seconds of discussion or an explicit buy/avoid, a chip on the "In this video" line for a quick pick with a side, nothing for earnings calendars, passing examples, portfolio lists, sponsors, indexes and coins. 30/hour per address on a miss. |
| `GET /api/extension/ticker?symbol=` | extension | The card's line and the More info panel: name, industry, live price and today's move (Finnhub, falling back to the snapshot), market cap, P/E, 52-week range, next earnings, two sentences of description, three months of closes, how many analysts have a live publication on it. Cached 30 seconds. |
| `POST /api/extension/session` | a Stoa page, same origin, with the reader's cookie | Makes the extension a session of its own for the signed-in reader (below). Refused from any other origin; no CORS. 20/hour per user. |
| `POST /api/extension/session/refresh` | extension | `{ refreshToken }` to a fresh pair. |
| `POST /api/extension/taps` | extension, bearer token | Up to 100 taps. Each goes through `createInterestCart(...).addTap(ticker, direction, "extension", { id, videoId, videoChannel, videoSeconds, at })`, the same module as a site tap. A held tap keeps the moment it was made if that is within the last week, else it is stamped now (the table's trigger will stamp `created_at` itself). 120/minute per user. |

### Sign-in

The reader signs in on stoamarket.ai as usual. The site never hands its own session over:
refreshing one Supabase session from two places makes Supabase revoke it and would sign the
reader out of the site. Instead, when a Stoa page sees the extension (`externally_connectable`,
only Stoa's origin can message it, and only at its id) and the extension is not signed in as
this reader, the page asks `/api/extension/session`, which makes a second session for the same
account (an admin sign-in link the server redeems itself; no email is sent), and passes it to
the extension. The extension refreshes it on its own and drops it when Stoa says sign in again.
Signing in as someone else on the same browser does not carry the previous reader's taps over.

Signed out, taps still work and are kept in the extension. A small card ("4 stocks picked ·
Save to Stoa") opens sign-up; once the reader is signed in and on any Stoa page, the session is
handed over and every held tap is sent.

### Where taps go today (temporary)

`/api/extension/taps` checks the account and shapes each tap, but there is nothing to write it
to until `interest_taps` exists, and the cart itself is kept in the reader's browser
(`TemporaryLocalCartStore`). So the route uses `ExtensionRelayStore`
(`src/lib/interest-cart/relay-store.ts`), which keeps nothing, and the extension holds each
accepted tap until the reader's next Stoa page, where `useExtensionBridge`
(`src/components/interest-cart/extension-bridge.ts`) pulls them into the cart under their own ids
(a second run cannot count one twice), applies Undos made after delivery, and sends the week's
counts back for the card. It runs on load, when the tab returns, every 30 seconds and after the
cart changes.

When `SupabaseCartStore` exists: use it in `/api/extension/taps` instead of
`ExtensionRelayStore`, read the card's weekly counts from `interest_cart_week` through a new
`GET /api/extension/week` (bearer), and delete the bridge's pull and ack steps (keep the
session hand-over). Extension taps then reach the table the moment they are made.

### The table: `video_ticker_index` (DRAFT 0070)

`supabase/migrations/0070_video_ticker_index.sql`, headed **DRAFT - DO NOT APPLY**. One row per
ticker per video: `video_id`, `ticker`, `kind` (card or line), `start_seconds`, `end_seconds`,
`stance` (bull, bear or null), `conditional`, `etf`, `name`, `what`, `language`, `model`,
`detected_at`; primary key `(video_id, ticker)`. A companion `video_ticker_reads` (one row per
video read) remembers videos read that had no ticker worth showing, so they are not paid for
again. No transcript is stored, here or anywhere. RLS on, nothing granted to `anon` or
`authenticated`: only the server reads and writes it with the service key. A re-read replaces a
video's rows in one transaction.

Until it is applied, `TemporaryVideoIndexCache` (`src/lib/db/video-ticker-index.ts`) keeps each
video's result in the app cache (Upstash when configured, otherwise one server instance's
memory) for 30 days, and on a developer's machine in `.next/cache`. Swapping in a Supabase store
means one class with `get` and `put`, and the one line in `videoTickerIndex()`.

### The four concerns, for the extension

**Scalability.** The AI is paid once per video, not per viewer: every later viewer is a primary
key lookup. Haiku costs a fraction of a cent per 20-minute transcript. Popular finance
channels publish a few videos a day each, so even 1,000 channels is a few thousand reads a day.
Two viewers opening the same new video at once share one read on a server instance (in-flight
map); across instances a rare double read is harmless (same result, last write wins). The ticker
info route reads market data that is already cached per symbol. Taps: the extension is the
likeliest source of runaway writes, hence the per-user limit on `/api/extension/taps` (and the
`check_rate_limit` RPC once taps hit the table).

**Caching.** Video results: by video id, 30 days, then read again (videos do not change, but the
symbol list and alias table improve). Ticker info: 30 seconds on the server and in the
extension, so a price on the card is at most about a minute old. Personal data (taps, counts)
is never cached on a server or a CDN: the card's counts come from the extension's own storage
and the site's report of the week, refreshed on every Stoa visit.

**Rendering.** Nothing is server-rendered for the extension: it draws its own card in a shadow
root in YouTube's right-hand column (never over the video, hidden in fullscreen), and the More
info panel in a second shadow root over the page. Stoa's site renders nothing new apart from the
bridge, a client hook inside the cart's runtime, so it ships only to readers the cart is open
to.

**Regionality.** Store times in UTC; the card's "this week" follows the reader's device clock,
like the cart. Keep the extension routes in the same Vercel region as Supabase. The AI call goes
to Anthropic's API (US). What goes there is the video's public transcript, never anything about
the reader. Taps with video and channel are viewing context tied to a person: they belong in the
data export and are deleted with the account like every tap. Counsel should see this.

## What Krisi needs to do

1. Review and apply `0068_interest_taps.sql` (remove the DRAFT header when applying). It now
   includes soft delete (removal columns, the removal functions, no delete grant): review that
   section before writing the store.
2. Add the RLS cases above to `npm run test:rls`.
3. Write `SupabaseCartStore` in `src/lib/db/` and swap it into `cartStore()`. Decide whether
   to import the temporary browser taps on first sign-in (as follows did) or let them go.
4. Decide retention and the global total's time zone before the extension ships.
5. Review and apply `0070_video_ticker_index.sql` (remove the DRAFT header), then write the
   Supabase `VideoTickerIndexStore` and swap it into `videoTickerIndex()`.
6. Set `ANTHROPIC_API_KEY` in Vercel (Production and Preview), server only.
7. With `SupabaseCartStore` in place: point `/api/extension/taps` at it and remove the bridge's
   pull and ack (section "Where taps go today").
8. Before a Chrome Web Store release: the store copy gets its own id; add it to
   `NEXT_PUBLIC_STOA_EXTENSION_IDS` and build the extension with
   `WXT_STOA_ORIGIN=https://www.stoamarket.ai`.
