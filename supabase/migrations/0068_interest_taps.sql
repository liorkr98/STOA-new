-- DRAFT - DO NOT APPLY
-- ===================================================================
-- Krisi applies this after review. Nothing in the app reads or writes
-- interest_taps yet: the cart runs on a temporary browser adapter
-- (src/lib/interest-cart/store.ts, TemporaryLocalCartStore) until this
-- table exists and a Supabase adapter replaces it. Spec:
-- docs/backend/interest-cart.md.
-- ===================================================================
--
-- The Interest Cart: a reader's weekly record of which tickers held their
-- attention. One row per tap. A tap is bull or bear, never neutral; bull and
-- bear are counted separately and nothing here ever stores or returns a net
-- figure. Taps come from the site today and from the Chrome extension later,
-- when they also carry the video, the channel and the moment in the video.

create table if not exists interest_taps (
  -- Made on the device. A tap held while signed out replays under the same
  -- id after sign-up, so a replay that runs twice inserts once.
  id uuid primary key,
  user_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  ticker text not null check (ticker ~ '^[A-Z0-9.=^-]{1,12}$'),
  direction text not null check (direction in ('bull', 'bear')),
  source text not null check (source in ('site', 'extension')),
  -- Extension taps only; null for every site tap.
  video_id text check (video_id is null or length(video_id) <= 64),
  video_channel text check (video_channel is null or length(video_channel) <= 128),
  video_seconds integer check (video_seconds is null or video_seconds >= 0),
  -- UTC. Weeks are worked out when read, in the reader's local time.
  created_at timestamptz not null default now(),
  constraint interest_taps_video_fields_from_extension check (
    source = 'extension' or (video_id is null and video_channel is null and video_seconds is null)
  )
);

-- The time of a tap is the server's, never the client's: a client cannot
-- backdate a tap into last week's cart.
create or replace function interest_taps_stamp() returns trigger
language plpgsql as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists interest_taps_stamp on interest_taps;
create trigger interest_taps_stamp before insert on interest_taps
  for each row execute function interest_taps_stamp();

-- "This user, this week": an equality on user_id and a range on created_at.
-- This one index serves the week read, the week list and the nav count.
create index if not exists interest_taps_user_time_idx
  on interest_taps (user_id, created_at desc);

-- Undo: this user's newest tap on one ticker.
create index if not exists interest_taps_user_ticker_time_idx
  on interest_taps (user_id, ticker, created_at desc);

alter table interest_taps enable row level security;

-- A person reads, adds and removes only their own taps. Taps are never
-- edited: no update policy, so an update is refused for everyone.
drop policy if exists interest_taps_select_own on interest_taps;
create policy interest_taps_select_own on interest_taps
  for select using (user_id = auth.uid());

drop policy if exists interest_taps_insert_own on interest_taps;
create policy interest_taps_insert_own on interest_taps
  for insert with check (user_id = auth.uid());

drop policy if exists interest_taps_delete_own on interest_taps;
create policy interest_taps_delete_own on interest_taps
  for delete using (user_id = auth.uid());

revoke all on interest_taps from anon;
grant select, insert, delete on interest_taps to authenticated;

-- -------------------------------------------------------------------
-- The weekly per-user aggregate.
--
-- A plain view cannot take the reader's time zone, and a week is a local
-- week, so the aggregate is a security-invoker function that behaves like a
-- parameterised view: RLS on interest_taps still applies, and the function
-- also filters on auth.uid() itself, so it can only ever return the caller's
-- own rows. p_week_starts_on follows Date.getDay(): 0 Sunday, 1 Monday.
-- -------------------------------------------------------------------

create or replace function interest_cart_week(p_from timestamptz, p_to timestamptz)
returns table (ticker text, bull integer, bear integer, total integer)
language sql stable security invoker as $$
  select
    t.ticker,
    count(*) filter (where t.direction = 'bull')::integer as bull,
    count(*) filter (where t.direction = 'bear')::integer as bear,
    count(*)::integer as total
  from interest_taps t
  where t.user_id = auth.uid()
    and t.created_at >= p_from
    and t.created_at < p_to
  group by t.ticker
  order by total desc, t.ticker;
$$;

create or replace function interest_cart_weeks(p_time_zone text, p_week_starts_on integer default 1)
returns table (week_start date, tickers integer, taps integer)
language sql stable security invoker as $$
  with local as (
    select t.ticker, (t.created_at at time zone p_time_zone)::date as day
    from interest_taps t
    where t.user_id = auth.uid()
  )
  select
    (day - ((extract(dow from day)::integer - p_week_starts_on + 7) % 7)) as week_start,
    count(distinct ticker)::integer as tickers,
    count(*)::integer as taps
  from local
  group by 1
  order by 1 desc;
$$;

revoke all on function interest_cart_week(timestamptz, timestamptz) from anon;
revoke all on function interest_cart_weeks(text, integer) from anon;
grant execute on function interest_cart_week(timestamptz, timestamptz) to authenticated;
grant execute on function interest_cart_weeks(text, integer) to authenticated;

-- -------------------------------------------------------------------
-- FUTURE, NOT PART OF THIS MIGRATION: the anonymised cross-user weekly
-- total. Kept here commented so the shape is reviewed with the table.
-- It exposes no user id and drops any ticker fewer than 10 people tapped
-- that week, so a rare ticker cannot be traced to a person.
--
-- create materialized view interest_cart_global_weekly as
--   select
--     date_trunc('week', created_at at time zone 'Asia/Jerusalem')::date as week_start,
--     ticker,
--     count(*) filter (where direction = 'bull') as bull,
--     count(*) filter (where direction = 'bear') as bear,
--     count(distinct user_id) as people
--   from interest_taps
--   group by 1, 2
--   having count(distinct user_id) >= 10;
-- create unique index on interest_cart_global_weekly (week_start, ticker);
-- revoke all on interest_cart_global_weekly from anon, authenticated;
-- -- Read through a server route with the service key; refresh with
-- -- `refresh materialized view concurrently` from a cron, hourly.
-- -------------------------------------------------------------------
