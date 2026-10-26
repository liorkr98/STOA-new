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
  -- Soft delete. A removed tap is kept: it stops counting, Undo can bring
  -- it back, and any future total can still see that a tap was made. Rows
  -- are never deleted through the API (no delete grant below).
  removed_at timestamptz,
  removal_id uuid,
  removed_reason text check (removed_reason in ('undo', 'remove')),
  constraint interest_taps_video_fields_from_extension check (
    source = 'extension' or (video_id is null and video_channel is null and video_seconds is null)
  ),
  constraint interest_taps_removal_all_or_none check (
    (removed_at is null and removal_id is null and removed_reason is null)
    or (removed_at is not null and removal_id is not null and removed_reason is not null)
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

-- The tap's Undo (this user's newest counted tap on one ticker) and removing
-- a ticker from the current week.
create index if not exists interest_taps_user_ticker_time_idx
  on interest_taps (user_id, ticker, created_at desc);

-- Restoring one removal.
create index if not exists interest_taps_removal_idx
  on interest_taps (removal_id) where removal_id is not null;

-- A tap is never edited. An update may only set or clear the three removal
-- columns, and the database stamps removed_at itself.
create or replace function interest_taps_guard_update() returns trigger
language plpgsql as $$
begin
  if (new.id, new.user_id, new.ticker, new.direction, new.source, new.video_id, new.video_channel, new.video_seconds, new.created_at)
     is distinct from
     (old.id, old.user_id, old.ticker, old.direction, old.source, old.video_id, old.video_channel, old.video_seconds, old.created_at) then
    raise exception 'interest_taps: a tap cannot be edited, only removed or restored';
  end if;
  if new.removed_at is not null and old.removed_at is null then
    new.removed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists interest_taps_guard_update on interest_taps;
create trigger interest_taps_guard_update before update on interest_taps
  for each row execute function interest_taps_guard_update();

alter table interest_taps enable row level security;

-- A person reads, adds, removes and restores only their own taps. Nobody
-- deletes a tap through the API (no delete policy or grant), and an update
-- can only touch the removal columns (column grant + the guard trigger).
drop policy if exists interest_taps_select_own on interest_taps;
create policy interest_taps_select_own on interest_taps
  for select using (user_id = auth.uid());

drop policy if exists interest_taps_insert_own on interest_taps;
create policy interest_taps_insert_own on interest_taps
  for insert with check (user_id = auth.uid());

drop policy if exists interest_taps_update_own on interest_taps;
create policy interest_taps_update_own on interest_taps
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on interest_taps from anon, authenticated;
grant select, insert on interest_taps to authenticated;
grant update (removed_at, removal_id, removed_reason) on interest_taps to authenticated;

-- -------------------------------------------------------------------
-- Removing and restoring. Security invoker: RLS applies, and each also
-- filters on auth.uid() itself.
-- -------------------------------------------------------------------

-- Take a ticker out of the CURRENT week: every counted tap on it, both
-- sides, under one new removal id. Refused for any range that is not the
-- week containing now() (at most 8 days, for a clock change): a closed week
-- is a record.
create or replace function interest_cart_remove_ticker(p_ticker text, p_from timestamptz, p_to timestamptz)
returns table (removal_id uuid, removed integer)
language plpgsql security invoker as $$
declare
  rid uuid := gen_random_uuid();
  n integer;
begin
  if not (now() >= p_from and now() < p_to and p_to - p_from <= interval '8 days') then
    raise exception 'interest_cart_remove_ticker: only the current week can be changed';
  end if;
  update interest_taps t
     set removed_at = now(), removal_id = rid, removed_reason = 'remove'
   where t.user_id = auth.uid()
     and t.ticker = upper(p_ticker)
     and t.removed_at is null
     and t.created_at >= p_from
     and t.created_at < p_to;
  get diagnostics n = row_count;
  return query select case when n > 0 then rid end, n;
end;
$$;

-- The tap toast's Undo: the newest counted tap on a ticker stops counting.
create or replace function interest_cart_undo_tap(p_ticker text)
returns uuid
language sql security invoker as $$
  update interest_taps
     set removed_at = now(), removal_id = gen_random_uuid(), removed_reason = 'undo'
   where id = (
     select id from interest_taps
      where user_id = auth.uid() and ticker = upper(p_ticker) and removed_at is null
      order by created_at desc
      limit 1
   )
  returning id;
$$;

-- Undo for a removal: exactly its taps count again. Only within the hour,
-- since Undo lives on a toast and a later restore could reopen a closed week.
create or replace function interest_cart_restore(p_removal_id uuid)
returns integer
language plpgsql security invoker as $$
declare
  n integer;
begin
  update interest_taps
     set removed_at = null, removal_id = null, removed_reason = null
   where user_id = auth.uid()
     and removal_id = p_removal_id
     and removed_at > now() - interval '1 hour';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function interest_cart_remove_ticker(text, timestamptz, timestamptz) from public, anon;
revoke all on function interest_cart_undo_tap(text) from public, anon;
revoke all on function interest_cart_restore(uuid) from public, anon;
grant execute on function interest_cart_remove_ticker(text, timestamptz, timestamptz) to authenticated;
grant execute on function interest_cart_undo_tap(text) to authenticated;
grant execute on function interest_cart_restore(uuid) to authenticated;

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
    and t.removed_at is null
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
      and t.removed_at is null
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
--   where removed_at is null  -- removed taps are kept but never counted
--   group by 1, 2
--   having count(distinct user_id) >= 10;
-- create unique index on interest_cart_global_weekly (week_start, ticker);
-- revoke all on interest_cart_global_weekly from anon, authenticated;
-- -- Read through a server route with the service key; refresh with
-- -- `refresh materialized view concurrently` from a cron, hourly.
-- -------------------------------------------------------------------
