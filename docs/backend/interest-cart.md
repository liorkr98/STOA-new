# Interest Cart: backend spec

For Krisi. Written 2026-10-13 with the first cart build (branch `feat/interest-cart`).
The draft migration is `supabase/migrations/0068_interest_taps.sql`, headed
**DRAFT - DO NOT APPLY**. Nothing has been run against the live database.

## What the cart is

A reader taps a bull or a bear beside a ticker. Each tap lands in that reader's cart for the
week. At the end of the week the cart shows which tickers actually held their attention. Later
a Chrome extension will spot tickers discussed in YouTube finance videos and send taps from
there too.

Product rules the backend must keep:

- A tap is `bull` or `bear`. There is no neutral tap. One tap is one count.
- Bull and bear are counted and stored separately. **Nothing returns a net figure or a sign.**
- The cart resets weekly. A week starts Monday 00:00 in the reader's own time zone.
- Older weeks stay readable.
- Saving needs an account. A signed-out tap is held on the device and replayed after sign-up.
- Every tap records its source: `site` now, `extension` later. Extension taps also carry the
  video id, the channel and the moment in the video.

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

## What Krisi needs to do

1. Review and apply `0068_interest_taps.sql` (remove the DRAFT header when applying). It now
   includes soft delete (removal columns, the removal functions, no delete grant): review that
   section before writing the store.
2. Add the RLS cases above to `npm run test:rls`.
3. Write `SupabaseCartStore` in `src/lib/db/` and swap it into `cartStore()`. Decide whether
   to import the temporary browser taps on first sign-in (as follows did) or let them go.
4. Decide retention and the global total's time zone before the extension ships.
