-- STOA bootstrap: run this entire file once in Supabase SQL Editor.
-- Do NOT paste filenames like 0001_init.sql — paste this file's contents.

-- =============================================================================
-- BEGIN 0001_init.sql
-- =============================================================================
-- Stoa schema: core tables. Apply migrations in order (0001 -> 0004).

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────
create type role as enum ('user', 'analyst', 'admin');
create type content_type as enum ('research', 'call', 'short_post');
create type report_status as enum ('draft', 'published', 'archived');
create type direction as enum ('long', 'short', 'hold');
create type outcome as enum ('open', 'hit', 'near', 'partial', 'miss');
create type access_type as enum ('free', 'subscribers', 'paid');
create type subscription_status as enum ('active', 'cancelled', 'expired');
create type txn_type as enum ('deposit', 'report_unlock', 'subscription', 'payout', 'refund');
create type txn_status as enum ('completed', 'refunded', 'failed');

-- ── Profiles (1:1 with auth.users) ───────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  role role not null default 'user',
  avatar_url text,
  cover_url text,
  bio text,
  headline text,
  score int not null default 0,
  rating int not null default 600,
  tier text not null default 'building',
  followers_count int not null default 0,
  sub_price numeric(10, 2),
  report_price numeric(10, 2),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_score_idx on profiles (score desc);
create index profiles_rating_idx on profiles (rating desc);
create index profiles_role_idx on profiles (role);

-- ── Reports ──────────────────────────────────────────────────────────────────
create table reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  type content_type not null,
  title text,
  summary text,
  status report_status not null default 'draft',
  access access_type not null default 'free',
  price numeric(10, 2),
  ticker text,
  likes int not null default 0,
  views int not null default 0,
  comment_count int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_author_idx on reports (author_id, created_at desc);
create index reports_status_idx on reports (status, published_at desc);
create index reports_ticker_idx on reports (ticker);

-- The long-form body lives in its own table so Row Level Security can gate the
-- paid/subscriber content at the database layer. Report rows stay public
-- (title, summary, ticker, prediction) as the teaser; the body is access-checked.
create table report_bodies (
  report_id uuid primary key references reports (id) on delete cascade,
  body text
);

-- ── Predictions (the investment card) ────────────────────────────────────────
create table predictions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  ticker text not null,
  direction direction not null,
  lock_price numeric(14, 4) not null,
  target_price numeric(14, 4),
  horizon_days int not null default 30,
  resolves_at timestamptz not null,
  resolved_price numeric(14, 4),
  -- S&P 500 (SPY) price captured at publish, used to compute alpha at resolution.
  bench_lock_price numeric(14, 4),
  benchmark_pct numeric(8, 2),
  bench_resolved_price numeric(14, 4),
  outcome outcome not null default 'open',
  return_pct numeric(8, 2),
  created_at timestamptz not null default now()
);

create index predictions_author_idx on predictions (author_id, created_at desc);
create index predictions_open_idx on predictions (outcome, resolves_at) where outcome = 'open';
create index predictions_report_idx on predictions (report_id);
create unique index predictions_report_unique on predictions (report_id);

-- ── Wallets + transactions ────────────────────────────────────────────────────
create table wallets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references profiles (id) on delete cascade,
  balance numeric(12, 2) not null default 0,
  earnings numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets (id) on delete cascade,
  owner_id uuid not null references profiles (id) on delete cascade,
  type txn_type not null,
  status txn_status not null default 'completed',
  amount numeric(12, 2) not null,
  related_id uuid,
  memo text,
  created_at timestamptz not null default now()
);

create index wallet_txn_owner_idx on wallet_transactions (owner_id, created_at desc);

-- ── Subscriptions ──────────────────────────────────────────────────────────────
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references profiles (id) on delete cascade,
  analyst_id uuid not null references profiles (id) on delete cascade,
  status subscription_status not null default 'active',
  price numeric(10, 2) not null,
  started_at timestamptz not null default now(),
  renews_at timestamptz not null default (now() + interval '30 days'),
  unique (subscriber_id, analyst_id)
);

create index subscriptions_analyst_idx on subscriptions (analyst_id, status);

-- ── Social graph + engagement ───────────────────────────────────────────────
create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  analyst_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, analyst_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  likes int not null default 0,
  created_at timestamptz not null default now()
);

create index comments_report_idx on comments (report_id, created_at desc);

create table likes (
  report_id uuid not null references reports (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table saved_reports (
  report_id uuid not null references reports (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table report_views (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  viewer_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index report_views_report_idx on report_views (report_id);

-- Records a buyer's unlock so paid reports stay readable after purchase.
create table report_unlocks (
  report_id uuid not null references reports (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  kind text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on notifications (recipient_id, created_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles (id) on delete cascade,
  recipient_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_pair_idx on messages (sender_id, recipient_id, created_at desc);


-- =============================================================================
-- BEGIN 0002_rls.sql
-- =============================================================================
-- Row Level Security. Every table is locked down; the service role bypasses RLS
-- for server jobs (seeding, grading, wallet settlement).

alter table profiles enable row level security;
alter table reports enable row level security;
alter table report_bodies enable row level security;
alter table predictions enable row level security;
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table subscriptions enable row level security;
alter table follows enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table saved_reports enable row level security;
alter table report_views enable row level security;
alter table report_unlocks enable row level security;
alter table notifications enable row level security;
alter table messages enable row level security;

-- ── Profiles: public read, self write ─────────────────────────────────────────
create policy profiles_read on profiles for select using (true);
create policy profiles_update_self on profiles for update using (id = auth.uid());

-- ── Reports: published is public; authors see + manage their own ─────────────
create policy reports_read on reports
  for select using (status = 'published' or author_id = auth.uid());
create policy reports_insert on reports
  for insert with check (author_id = auth.uid());
create policy reports_update on reports
  for update using (author_id = auth.uid());
create policy reports_delete on reports
  for delete using (author_id = auth.uid());

-- ── Report bodies: the actual paywall. Readable only for free reports, the
-- author, a pay-per-report unlock, or an active subscription (subscriber-only). ─
create policy bodies_read on report_bodies
  for select using (
    exists (
      select 1 from reports r
      where r.id = report_bodies.report_id
        and (
          r.author_id = auth.uid()
          or (
            r.status = 'published'
            and (
              r.access = 'free'
              or (
                r.access = 'paid'
                and exists (
                  select 1 from report_unlocks u
                  where u.report_id = r.id and u.user_id = auth.uid()
                )
              )
              or (
                r.access = 'subscribers'
                and exists (
                  select 1 from subscriptions s
                  where s.analyst_id = r.author_id
                    and s.subscriber_id = auth.uid()
                    and s.status = 'active'
                    and s.renews_at > now()
                )
              )
            )
          )
        )
    )
  );
create policy bodies_write on report_bodies
  for insert with check (
    exists (select 1 from reports r where r.id = report_id and r.author_id = auth.uid())
  );
create policy bodies_update on report_bodies
  for update using (
    exists (select 1 from reports r where r.id = report_bodies.report_id and r.author_id = auth.uid())
  );

-- ── Predictions: readable when their report is; author inserts; engine resolves
create policy predictions_read on predictions
  for select using (
    exists (
      select 1 from reports r
      where r.id = predictions.report_id
        and (r.status = 'published' or r.author_id = auth.uid())
    )
  );
create policy predictions_insert on predictions
  for insert with check (author_id = auth.uid());

-- ── Wallets + transactions: owner reads only; writes go through SECURITY DEFINER
create policy wallets_read on wallets for select using (owner_id = auth.uid());
create policy wallet_txn_read on wallet_transactions for select using (owner_id = auth.uid());

-- ── Subscriptions: both parties read; settlement via RPC ──────────────────────
create policy subscriptions_read on subscriptions
  for select using (subscriber_id = auth.uid() or analyst_id = auth.uid());

-- ── Follows: public read; self write ──────────────────────────────────────────
create policy follows_read on follows for select using (true);
create policy follows_insert on follows for insert with check (follower_id = auth.uid());
create policy follows_delete on follows for delete using (follower_id = auth.uid());

-- ── Comments: public read; self write/delete ─────────────────────────────────
create policy comments_read on comments for select using (true);
create policy comments_insert on comments for insert with check (author_id = auth.uid());
create policy comments_delete on comments for delete using (author_id = auth.uid());

-- ── Likes / saves / views: self managed ───────────────────────────────────────
create policy likes_read on likes for select using (true);
create policy likes_write on likes for insert with check (user_id = auth.uid());
create policy likes_delete on likes for delete using (user_id = auth.uid());

create policy saved_read on saved_reports for select using (user_id = auth.uid());
create policy saved_write on saved_reports for insert with check (user_id = auth.uid());
create policy saved_delete on saved_reports for delete using (user_id = auth.uid());

create policy views_insert on report_views for insert with check (true);
create policy views_read on report_views for select using (true);

create policy unlocks_read on report_unlocks for select using (user_id = auth.uid());

-- ── Notifications: recipient reads + marks read ───────────────────────────────
create policy notifications_read on notifications for select using (recipient_id = auth.uid());
create policy notifications_update on notifications for update using (recipient_id = auth.uid());

-- ── Messages: either party reads; sender writes ───────────────────────────────
create policy messages_read on messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy messages_insert on messages for insert with check (sender_id = auth.uid());
create policy messages_update on messages
  for update using (recipient_id = auth.uid());


-- =============================================================================
-- BEGIN 0003_functions.sql
-- =============================================================================
-- Triggers + secure wallet settlement functions.

-- ── updated_at maintenance ────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reports_updated_at before update on reports
  for each row execute function set_updated_at();
create trigger wallets_updated_at before update on wallets
  for each row execute function set_updated_at();

-- ── New auth user -> profile + wallet with demo starting credits ──────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_handle text;
  v_name text;
  v_wallet uuid;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  v_handle := coalesce(new.raw_user_meta_data ->> 'handle', split_part(new.email, '@', 1));
  -- Ensure handle uniqueness with a short suffix if needed.
  if exists (select 1 from profiles where handle = v_handle) then
    v_handle := v_handle || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into profiles (id, handle, display_name)
  values (new.id, v_handle, v_name);

  insert into wallets (owner_id, balance) values (new.id, 100)
  returning id into v_wallet;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, memo)
  values (v_wallet, new.id, 'deposit', 100, 'Welcome credits');

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ── Engagement counters ───────────────────────────────────────────────────────
create or replace function bump_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update reports set likes = likes + 1 where id = new.report_id;
  elsif tg_op = 'DELETE' then
    update reports set likes = greatest(0, likes - 1) where id = old.report_id;
  end if;
  return null;
end;
$$;

create trigger likes_counter after insert or delete on likes
  for each row execute function bump_like();

create or replace function bump_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update reports set comment_count = comment_count + 1 where id = new.report_id;
  elsif tg_op = 'DELETE' then
    update reports set comment_count = greatest(0, comment_count - 1) where id = old.report_id;
  end if;
  return null;
end;
$$;

create trigger comments_counter after insert or delete on comments
  for each row execute function bump_comment();

create or replace function bump_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update profiles set followers_count = followers_count + 1 where id = new.analyst_id;
  elsif tg_op = 'DELETE' then
    update profiles set followers_count = greatest(0, followers_count - 1) where id = old.analyst_id;
  end if;
  return null;
end;
$$;

create trigger follows_counter after insert or delete on follows
  for each row execute function bump_follow();

-- ── View counter ──────────────────────────────────────────────────────────────
create or replace function increment_views(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update reports set views = views + 1 where id = p_report_id;
end;
$$;

-- ── Pay-per-report unlock (atomic, 90/10 split) ──────────────────────────────
create or replace function purchase_report(p_report_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_buyer uuid := auth.uid();
  v_report reports%rowtype;
  v_price numeric(12, 2);
  v_cut numeric(12, 2);
  v_share numeric(12, 2);
  v_buyer_wallet wallets%rowtype;
  v_author_wallet_id uuid;
  v_author_price numeric(10, 2);
begin
  if v_buyer is null then
    raise exception 'not authenticated';
  end if;

  select * into v_report from reports where id = p_report_id;
  if not found then raise exception 'report not found'; end if;
  if v_report.access <> 'paid' then raise exception 'report is not pay-per-report'; end if;
  if v_report.author_id = v_buyer then raise exception 'cannot purchase your own report'; end if;

  if exists (select 1 from report_unlocks where report_id = p_report_id and user_id = v_buyer) then
    return jsonb_build_object('status', 'already_unlocked');
  end if;

  select coalesce(v_report.price, report_price) into v_author_price
    from profiles where id = v_report.author_id;
  v_price := coalesce(v_report.price, v_author_price, 0);
  if v_price <= 0 then raise exception 'report has no price'; end if;

  select * into v_buyer_wallet from wallets where owner_id = v_buyer for update;
  if v_buyer_wallet.balance < v_price then raise exception 'insufficient balance'; end if;

  v_cut := round(v_price * 0.10, 2);
  v_share := v_price - v_cut;

  update wallets set balance = balance - v_price where owner_id = v_buyer;

  select id into v_author_wallet_id from wallets where owner_id = v_report.author_id for update;
  update wallets
    set balance = balance + v_share, earnings = earnings + v_share
    where id = v_author_wallet_id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_buyer_wallet.id, v_buyer, 'report_unlock', -v_price, p_report_id, v_report.title);

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_author_wallet_id, v_report.author_id, 'payout', v_share, p_report_id, 'Report sale (90%)');

  insert into report_unlocks (report_id, user_id) values (p_report_id, v_buyer);

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_report.author_id, v_buyer, 'sale', 'Someone unlocked your report', '/report/' || p_report_id);

  return jsonb_build_object(
    'status', 'unlocked',
    'spent', v_price,
    'platform_fee', v_cut,
    'author_share', v_share,
    'new_balance', v_buyer_wallet.balance - v_price
  );
end;
$$;

-- ── Demo top-up (simulated deposit; replace with PayPal later) ────────────────
create or replace function top_up(p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_wallet wallets%rowtype;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_amount <= 0 or p_amount > 1000 then raise exception 'invalid amount'; end if;

  select * into v_wallet from wallets where owner_id = v_user for update;
  update wallets set balance = balance + p_amount where owner_id = v_user;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, memo)
  values (v_wallet.id, v_user, 'deposit', p_amount, 'Demo top-up');

  return jsonb_build_object('status', 'ok', 'new_balance', v_wallet.balance + p_amount);
end;
$$;

-- ── Subscribe to an analyst (atomic, 90/10 split) ────────────────────────────
create or replace function subscribe_to_analyst(p_analyst_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_buyer uuid := auth.uid();
  v_price numeric(10, 2);
  v_cut numeric(12, 2);
  v_share numeric(12, 2);
  v_buyer_wallet wallets%rowtype;
  v_author_wallet_id uuid;
begin
  if v_buyer is null then raise exception 'not authenticated'; end if;
  if v_buyer = p_analyst_id then raise exception 'cannot subscribe to yourself'; end if;

  if exists (
    select 1 from subscriptions
    where subscriber_id = v_buyer and analyst_id = p_analyst_id and status = 'active'
  ) then
    return jsonb_build_object('status', 'already_subscribed');
  end if;

  select sub_price into v_price from profiles where id = p_analyst_id;
  if v_price is null or v_price <= 0 then raise exception 'analyst has no subscription price'; end if;

  select * into v_buyer_wallet from wallets where owner_id = v_buyer for update;
  if v_buyer_wallet.balance < v_price then raise exception 'insufficient balance'; end if;

  v_cut := round(v_price * 0.10, 2);
  v_share := v_price - v_cut;

  update wallets set balance = balance - v_price where owner_id = v_buyer;
  select id into v_author_wallet_id from wallets where owner_id = p_analyst_id for update;
  update wallets set balance = balance + v_share, earnings = earnings + v_share
    where id = v_author_wallet_id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_buyer_wallet.id, v_buyer, 'subscription', -v_price, p_analyst_id, 'Monthly subscription');

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_author_wallet_id, p_analyst_id, 'payout', v_share, p_analyst_id, 'Subscription (90%)');

  insert into subscriptions (subscriber_id, analyst_id, status, price)
  values (v_buyer, p_analyst_id, 'active', v_price)
  on conflict (subscriber_id, analyst_id)
  do update set status = 'active', price = excluded.price,
    started_at = now(), renews_at = now() + interval '30 days';

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (p_analyst_id, v_buyer, 'subscribe', 'You have a new subscriber', null);

  return jsonb_build_object(
    'status', 'subscribed',
    'spent', v_price,
    'platform_fee', v_cut,
    'author_share', v_share,
    'new_balance', v_buyer_wallet.balance - v_price
  );
end;
$$;

-- ── Expire lapsed subscriptions (called by the hourly cron) ───────────────────
create or replace function expire_subscriptions()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update subscriptions
  set status = 'expired'
  where status = 'active' and renews_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


-- =============================================================================
-- BEGIN 0004_storage.sql
-- =============================================================================
-- Storage buckets for avatars and report cover images.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('covers', 'covers', true)
on conflict (id) do nothing;

-- Anyone can read public assets.
create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "public read covers" on storage.objects
  for select using (bucket_id = 'covers');

-- Authenticated users manage their own files (path prefixed with their uid).
create policy "own upload avatars" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own update avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own upload covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own update covers" on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);


-- =============================================================================
-- BEGIN 0005_rating_expiry_indexes.sql
-- =============================================================================
-- Rating storage, subscription expiry, schema hardening, paywall fix.
-- Run after 0001-0004 on existing projects.

-- ── Canonical 600-1400 display rating (score 0-100 stays for tiers) ───────────
alter table profiles add column if not exists rating int not null default 600;

-- Backfill from existing 0-100 scores.
update profiles
set rating = 600 + round((score::numeric / 100) * 800)
where rating = 600 and score > 0;

create index if not exists profiles_rating_idx on profiles (rating desc);

-- ── Benchmark audit trail at resolution ───────────────────────────────────────
alter table predictions add column if not exists bench_resolved_price numeric(14, 4);

-- One investment card per report.
create unique index if not exists predictions_report_unique on predictions (report_id);

create index if not exists report_views_report_idx on report_views (report_id);

-- ── Subscription expiry (30-day renews_at) ────────────────────────────────────
create or replace function expire_subscriptions()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update subscriptions
  set status = 'expired'
  where status = 'active' and renews_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── Paywall: subscribers no longer bypass paid-report unlock ──────────────────
drop policy if exists bodies_read on report_bodies;

create policy bodies_read on report_bodies
  for select using (
    exists (
      select 1 from reports r
      where r.id = report_bodies.report_id
        and (
          r.author_id = auth.uid()
          or (
            r.status = 'published'
            and (
              r.access = 'free'
              or (
                r.access = 'paid'
                and exists (
                  select 1 from report_unlocks u
                  where u.report_id = r.id and u.user_id = auth.uid()
                )
              )
              or (
                r.access = 'subscribers'
                and exists (
                  select 1 from subscriptions s
                  where s.analyst_id = r.author_id
                    and s.subscriber_id = auth.uid()
                    and s.status = 'active'
                    and s.renews_at > now()
                )
              )
            )
          )
        )
    )
  );


-- =============================================================================
-- BEGIN 0006_market_reference_data.sql
-- =============================================================================
-- Reference market data from Kaggle imports (SEC financials, SP futures).
-- Live quotes come from Yahoo Finance; these tables supplement fundamentals and history.

create table company_financials (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  cik text,
  period_end date not null,
  frequency text not null check (frequency in ('annual', 'quarterly')),
  filing_type text,
  revenue numeric,
  net_income numeric,
  total_assets numeric,
  total_liabilities numeric,
  shareholders_equity numeric,
  eps numeric,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (symbol, period_end, frequency)
);

create index company_financials_symbol_idx on company_financials (symbol, period_end desc);

-- Daily/hourly SP benchmark bars aggregated from Kaggle tick data.
create table sp_benchmark_bars (
  id uuid primary key default gen_random_uuid(),
  bar_time timestamptz not null,
  open numeric(14, 4) not null,
  high numeric(14, 4) not null,
  low numeric(14, 4) not null,
  close numeric(14, 4) not null,
  volume bigint,
  source text not null default 'kaggle',
  unique (bar_time, source)
);

create index sp_benchmark_bars_time_idx on sp_benchmark_bars (bar_time desc);

-- Public read for reference data (no PII).
alter table company_financials enable row level security;
alter table sp_benchmark_bars enable row level security;

create policy company_financials_read on company_financials
  for select using (true);

create policy sp_benchmark_bars_read on sp_benchmark_bars
  for select using (true);


-- =============================================================================
-- BEGIN 0007_subscription_cancel.sql
-- =============================================================================
-- Allow investors to cancel an active subscription (no refund; access until renews_at).

create or replace function cancel_subscription(p_analyst_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscriber_id uuid := auth.uid();
  v_row subscriptions%rowtype;
begin
  if v_subscriber_id is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  select * into v_row
  from subscriptions
  where subscriber_id = v_subscriber_id
    and analyst_id = p_analyst_id
    and status = 'active'
  limit 1;

  if not found then
    return json_build_object('error', 'No active subscription');
  end if;

  update subscriptions
  set status = 'cancelled'
  where id = v_row.id;

  return json_build_object('status', 'cancelled', 'renews_at', v_row.renews_at);
end;
$$;

grant execute on function cancel_subscription(uuid) to authenticated;


-- =============================================================================
-- BEGIN 0008_profile_config.sql
-- =============================================================================
-- Profile branding: customizable sections, banner style, specialties.

alter table profiles
  add column if not exists profile_config jsonb not null default '{}'::jsonb;

comment on column profiles.profile_config is
  'Branding JSON: sections order, specialties, social links, banner_style, featured tickers.';


-- =============================================================================
-- BEGIN 0009_ai_credits.sql
-- =============================================================================
-- AI credits economy + fact-check storage on reports.

alter type txn_type add value if not exists 'ai_spend';
alter type txn_type add value if not exists 'conversion';

alter table wallets
  add column if not exists ai_credits int not null default 50;

alter table wallet_transactions
  add column if not exists credits int;

alter table reports
  add column if not exists fact_check_results jsonb;

comment on column wallets.ai_credits is 'AI feature credits. $1 balance converts to 10 credits.';
comment on column reports.fact_check_results is 'JSON array of classified claims from fact-check run.';

-- Backfill welcome credits for existing wallets.
update wallets set ai_credits = 50 where ai_credits = 0;

-- Spend AI credits atomically. Returns new balance or error JSON.
create or replace function spend_ai_credits(p_credits int, p_memo text default 'AI usage')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet wallets%rowtype;
begin
  if v_user is null then
    return json_build_object('error', 'Not authenticated');
  end if;
  if p_credits is null or p_credits <= 0 then
    return json_build_object('error', 'Invalid credit amount');
  end if;

  select * into v_wallet from wallets where owner_id = v_user for update;
  if not found then
    return json_build_object('error', 'Wallet not found');
  end if;
  if v_wallet.ai_credits < p_credits then
    return json_build_object(
      'error', 'insufficient_credits',
      'have', v_wallet.ai_credits,
      'need', p_credits
    );
  end if;

  update wallets set ai_credits = ai_credits - p_credits where id = v_wallet.id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, credits, memo)
  values (v_wallet.id, v_user, 'ai_spend', 0, -p_credits, coalesce(p_memo, 'AI usage'));

  return json_build_object(
    'status', 'ok',
    'spent', p_credits,
    'remaining', v_wallet.ai_credits - p_credits
  );
end;
$$;

grant execute on function spend_ai_credits(int, text) to authenticated;

-- Convert wallet USD balance to AI credits ($1 = 10 credits).
create or replace function convert_to_ai_credits(p_usd numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet wallets%rowtype;
  v_credits int;
begin
  if v_user is null then
    return json_build_object('error', 'Not authenticated');
  end if;
  if p_usd is null or p_usd <= 0 or p_usd > 500 then
    return json_build_object('error', 'Amount must be between $0.01 and $500');
  end if;

  select * into v_wallet from wallets where owner_id = v_user for update;
  if v_wallet.balance < p_usd then
    return json_build_object('error', 'insufficient balance');
  end if;

  v_credits := floor(p_usd * 10);

  update wallets
  set balance = balance - p_usd,
      ai_credits = ai_credits + v_credits
  where id = v_wallet.id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, credits, memo)
  values (
    v_wallet.id, v_user, 'conversion', -p_usd, v_credits,
    format('Converted $%s to %s AI credits', p_usd, v_credits)
  );

  return json_build_object(
    'status', 'ok',
    'credits_added', v_credits,
    'new_balance', v_wallet.balance - p_usd,
    'new_credits', v_wallet.ai_credits + v_credits
  );
end;
$$;

grant execute on function convert_to_ai_credits(numeric) to authenticated;


-- =============================================================================
-- BEGIN 0010_profile_bootstrap.sql
-- =============================================================================
-- Allow users to create their own profile if the signup trigger didn't run.
create policy profiles_insert_self on profiles
  for insert with check (id = auth.uid());

-- Idempotent profile + wallet bootstrap (e.g. auth user exists but trigger missed).
create or replace function ensure_user_profile()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_name text;
  v_handle text;
  v_wallet uuid;
begin
  if v_user is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  if exists (select 1 from profiles where id = v_user) then
    return json_build_object('status', 'exists');
  end if;

  select email into v_email from auth.users where id = v_user;
  v_name := coalesce(
    (select raw_user_meta_data ->> 'display_name' from auth.users where id = v_user),
    split_part(v_email, '@', 1)
  );
  v_handle := lower(regexp_replace(split_part(v_email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  if exists (select 1 from profiles where handle = v_handle) then
    v_handle := v_handle || '_' || substr(v_user::text, 1, 4);
  end if;

  insert into profiles (id, handle, display_name)
  values (v_user, v_handle, v_name);

  insert into wallets (owner_id, balance) values (v_user, 100)
  returning id into v_wallet;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, memo)
  values (v_wallet, v_user, 'deposit', 100, 'Welcome credits');

  return json_build_object('status', 'created', 'handle', v_handle);
end;
$$;

grant execute on function ensure_user_profile() to authenticated;


-- =============================================================================
-- BEGIN 0011_social_notifications.sql
-- =============================================================================
-- Newsletter fan-out + social notifications (Substack-style engagement loop).
-- All functions are SECURITY DEFINER so they can write notifications for other
-- users while still verifying the acting user via auth.uid().

-- Notify an analyst's followers and active subscribers when they publish.
create or replace function notify_publication(p_report_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_report reports%rowtype;
  v_title text;
  v_count int := 0;
begin
  if v_actor is null then return 0; end if;

  select * into v_report from reports where id = p_report_id;
  if not found then return 0; end if;
  if v_report.author_id <> v_actor then return 0; end if;
  if v_report.status <> 'published' then return 0; end if;

  v_title := coalesce(nullif(v_report.title, ''), nullif(v_report.summary, ''), 'a new publication');

  insert into notifications (recipient_id, actor_id, kind, body, link)
  select distinct r.recipient, v_actor, 'publication',
    'published "' || left(v_title, 80) || '"',
    '/report/' || p_report_id
  from (
    select follower_id as recipient from follows where analyst_id = v_actor
    union
    select subscriber_id as recipient from subscriptions
      where analyst_id = v_actor and status = 'active' and renews_at > now()
  ) r
  where r.recipient <> v_actor;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function notify_publication(uuid) to authenticated;

-- Notify an analyst that someone followed them.
create or replace function notify_follow(p_analyst_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or v_actor = p_analyst_id then return; end if;
  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (p_analyst_id, v_actor, 'follow', 'started following you', null);
end;
$$;

grant execute on function notify_follow(uuid) to authenticated;

-- Notify a report's author about a like or comment.
create or replace function notify_report_event(p_report_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_author uuid;
  v_title text;
  v_body text;
begin
  if v_actor is null then return; end if;
  if p_kind not in ('like', 'comment') then return; end if;

  select author_id, coalesce(nullif(title, ''), nullif(summary, ''), 'your post')
    into v_author, v_title
  from reports where id = p_report_id;

  if v_author is null or v_author = v_actor then return; end if;

  v_body := case p_kind
    when 'like' then 'liked "' || left(v_title, 60) || '"'
    else 'commented on "' || left(v_title, 60) || '"'
  end;

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_author, v_actor, p_kind, v_body, '/report/' || p_report_id);
end;
$$;

grant execute on function notify_report_event(uuid, text) to authenticated;


-- =============================================================================
-- BEGIN 0012_trust_compliance.sql
-- =============================================================================
-- Trust & compliance layer.
--
-- Core principle: anything that becomes part of a creator's public track record
-- is append-only. Enforced here with triggers, not just app-level checks — a
-- locked report/call is only as trustworthy as the guarantee that nobody,
-- including the platform operator, can quietly edit it after the fact.

-- ============================================================
-- Disclosure block (mandatory, Reg-AC-style "these are my own views" cert)
-- ============================================================
alter table reports
  add column if not exists locked_at timestamptz,
  add column if not exists position_disclosed boolean not null default false,
  add column if not exists position_held boolean,
  add column if not exists compensation_disclosed boolean not null default false,
  add column if not exists compensation_tied boolean,
  add column if not exists compensation_detail text,
  add column if not exists views_certified boolean not null default false;

comment on column reports.locked_at is 'Set once at publish. Freezes title/summary/ticker/access/price via trigger below.';
comment on column reports.position_disclosed is 'Author explicitly answered the "do you hold a position" question.';
comment on column reports.position_held is 'True if the author holds a position in the ticker discussed.';
comment on column reports.compensation_disclosed is 'Author explicitly answered the "were you compensated" question.';
comment on column reports.compensation_tied is 'True if compensation is tied to this specific piece of content.';
comment on column reports.views_certified is 'Author certified "these are my own views" prior to publish (Reg-AC style).';

create index if not exists reports_locked_idx on reports (locked_at) where locked_at is not null;

-- Backfill locked_at for anything already published, so the immutability
-- trigger below applies retroactively to existing published content.
update reports set locked_at = published_at where status = 'published' and locked_at is null;

-- ============================================================
-- Immutability enforcement — reports
-- ============================================================
create or replace function prevent_locked_report_edit()
returns trigger language plpgsql as $$
begin
  if OLD.locked_at is not null then
    if NEW.title is distinct from OLD.title
       or NEW.summary is distinct from OLD.summary
       or NEW.ticker is distinct from OLD.ticker
       or NEW.type is distinct from OLD.type
       or NEW.access is distinct from OLD.access
       or NEW.price is distinct from OLD.price
       or NEW.locked_at is distinct from OLD.locked_at
       or (NEW.status = 'draft' and OLD.status <> 'draft') then
      raise exception 'Cannot modify a locked report''s content, pricing, ticker, or lock timestamp. Only status (archive), engagement counters, and fact_check_results are mutable after lock.';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists enforce_report_immutability on reports;
create trigger enforce_report_immutability
before update on reports
for each row execute function prevent_locked_report_edit();

-- Set locked_at automatically the moment a report transitions to 'published'.
create or replace function set_report_locked_at()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'published' and OLD.status is distinct from 'published' and NEW.locked_at is null then
    NEW.locked_at := coalesce(NEW.published_at, now());
  end if;
  return NEW;
end;
$$;

drop trigger if exists set_locked_at_on_publish on reports;
create trigger set_locked_at_on_publish
before update on reports
for each row execute function set_report_locked_at();

-- Block hard deletes of anything ever locked — only drafts can be deleted.
create or replace function prevent_locked_report_delete()
returns trigger language plpgsql as $$
begin
  if OLD.locked_at is not null then
    raise exception 'Locked reports cannot be deleted, only archived.';
  end if;
  return OLD;
end;
$$;

drop trigger if exists enforce_report_no_delete on reports;
create trigger enforce_report_no_delete
before delete on reports
for each row execute function prevent_locked_report_delete();

-- ============================================================
-- Immutability enforcement — report bodies (freeze once parent is locked)
-- ============================================================
create or replace function prevent_locked_body_edit()
returns trigger language plpgsql as $$
declare v_locked timestamptz;
begin
  select locked_at into v_locked from reports where id = coalesce(NEW.report_id, OLD.report_id);
  if v_locked is not null then
    raise exception 'Cannot modify the body of a locked report.';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists enforce_body_immutability on report_bodies;
create trigger enforce_body_immutability
before update or delete on report_bodies
for each row execute function prevent_locked_body_edit();

-- ============================================================
-- Immutability enforcement — predictions (the price-target lock)
-- ============================================================
-- The call's terms (ticker, direction, lock/target price, horizon, resolves_at,
-- benchmark lock price) are frozen the instant the row exists. Only the
-- resolution fields may be written, and only once (open -> a terminal outcome).
create or replace function prevent_prediction_terms_edit()
returns trigger language plpgsql as $$
begin
  if NEW.ticker is distinct from OLD.ticker
     or NEW.direction is distinct from OLD.direction
     or NEW.lock_price is distinct from OLD.lock_price
     or NEW.target_price is distinct from OLD.target_price
     or NEW.horizon_days is distinct from OLD.horizon_days
     or NEW.resolves_at is distinct from OLD.resolves_at
     or NEW.bench_lock_price is distinct from OLD.bench_lock_price
     or NEW.report_id is distinct from OLD.report_id
     or NEW.author_id is distinct from OLD.author_id then
    raise exception 'Cannot modify a locked call''s ticker, direction, price target, horizon, or benchmark lock.';
  end if;
  if OLD.outcome <> 'open' and NEW.outcome is distinct from OLD.outcome then
    raise exception 'Cannot re-resolve a call that has already been graded.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists enforce_prediction_immutability on predictions;
create trigger enforce_prediction_immutability
before update on predictions
for each row execute function prevent_prediction_terms_edit();

create or replace function prevent_prediction_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'Calls cannot be deleted once created — they are part of the public track record.';
  return OLD;
end;
$$;

drop trigger if exists enforce_prediction_no_delete on predictions;
create trigger enforce_prediction_no_delete
before delete on predictions
for each row execute function prevent_prediction_delete();

-- ============================================================
-- Audit log — append-only trail for anything compliance-sensitive
-- ============================================================
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  action text not null, -- 'report.locked' | 'report.resolved' | 'report.archived' | 'payout.sent' | 'identity.verified' | 'connect.activated' ...
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on audit_log (entity_type, entity_id);
create index if not exists audit_log_actor_idx on audit_log (actor_id, created_at desc);

alter table audit_log enable row level security;

-- Only admins can browse the audit trail; nobody can update/delete it (append-only).
create policy audit_log_admin_read on audit_log
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Helper used by triggers and SECURITY DEFINER functions to append a row.
-- Postgres grants EXECUTE to PUBLIC on new functions by default — explicitly
-- revoke it so this is only reachable from other SECURITY DEFINER functions
-- and BEFORE/AFTER triggers (which run as the definer, bypassing the revoke),
-- never directly by a client via `supabase.rpc()`. This keeps the log
-- genuinely tamper-resistant rather than just conventionally private.
create or replace function log_audit(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke execute on function log_audit(uuid, text, text, uuid, jsonb) from public;

-- Auto-log report lock + archive transitions.
create or replace function audit_report_transitions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'published' and OLD.status is distinct from 'published' then
    perform log_audit(NEW.author_id, 'report.locked', 'report', NEW.id,
      jsonb_build_object('ticker', NEW.ticker, 'type', NEW.type));
  elsif NEW.status = 'archived' and OLD.status is distinct from 'archived' then
    perform log_audit(NEW.author_id, 'report.archived', 'report', NEW.id, '{}'::jsonb);
  end if;
  return NEW;
end;
$$;

drop trigger if exists audit_report_transitions_trg on reports;
create trigger audit_report_transitions_trg
after update on reports
for each row execute function audit_report_transitions();

-- Auto-log call resolution (grading engine flips outcome away from 'open').
create or replace function audit_prediction_resolution()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.outcome <> 'open' and OLD.outcome = 'open' then
    perform log_audit(NEW.author_id, 'report.resolved', 'prediction', NEW.id,
      jsonb_build_object(
        'ticker', NEW.ticker,
        'outcome', NEW.outcome,
        'return_pct', NEW.return_pct,
        'resolved_price', NEW.resolved_price
      ));
  end if;
  return NEW;
end;
$$;

drop trigger if exists audit_prediction_resolution_trg on predictions;
create trigger audit_prediction_resolution_trg
after update on predictions
for each row execute function audit_prediction_resolution();

-- Auto-log payouts (creator earnings from a sale or subscription).
create or replace function audit_payout()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.type = 'payout' then
    perform log_audit(NEW.owner_id, 'payout.sent', 'wallet_transaction', NEW.id,
      jsonb_build_object('amount', NEW.amount, 'related_id', NEW.related_id, 'memo', NEW.memo));
  end if;
  return NEW;
end;
$$;

drop trigger if exists audit_payout_trg on wallet_transactions;
create trigger audit_payout_trg
after insert on wallet_transactions
for each row execute function audit_payout();


-- =============================================================================
-- BEGIN 0013_claims_debate.sql
-- =============================================================================
-- Structured fact-checker claims + claim-scoped debate.
--
-- `reports.fact_check_results` (added in 0009) stays as a fast-read JSON summary
-- for the report card chip. This migration adds the authoritative, queryable
-- store: one row per atomic claim, with character offsets so the frontend can
-- highlight inline without re-parsing the body, and a verdict enum instead of
-- a free-text type.

create type claim_verdict as enum ('fact', 'unproven', 'opinion', 'contradicted');

create table claims (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  claim_text text not null,
  verdict claim_verdict not null,
  confidence numeric check (confidence between 0 and 1),
  note text,
  source_url text,
  char_start integer not null default 0,
  char_end integer not null default 0,
  created_at timestamptz not null default now()
);

create index claims_report_idx on claims (report_id);
create index claims_verdict_idx on claims (report_id, verdict);

-- Claims freeze the moment the parent report locks — matches the same
-- append-only guarantee as the report body and the price-target lock.
create or replace function prevent_claim_edit_if_report_locked()
returns trigger language plpgsql as $$
declare v_locked timestamptz;
begin
  select locked_at into v_locked from reports where id = coalesce(NEW.report_id, OLD.report_id);
  if v_locked is not null then
    raise exception 'Cannot modify fact-check claims on a locked report.';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create trigger enforce_claims_immutability
before update or delete on claims
for each row execute function prevent_claim_edit_if_report_locked();

alter table claims enable row level security;

-- Readable by anyone who can read the parent report (published, or the author).
create policy claims_read on claims
  for select using (
    exists (
      select 1 from reports r
      where r.id = claims.report_id
        and (r.status = 'published' or r.author_id = auth.uid())
    )
  );

-- Only the report's author can write claims, and only while the report is
-- still a draft (the trigger above enforces the post-lock freeze too, but
-- checking here fails fast with a clean policy violation instead of a raise).
create policy claims_insert on claims
  for insert with check (
    exists (
      select 1 from reports r
      where r.id = claims.report_id and r.author_id = auth.uid() and r.locked_at is null
    )
  );

create policy claims_update on claims
  for update using (
    exists (
      select 1 from reports r
      where r.id = claims.report_id and r.author_id = auth.uid() and r.locked_at is null
    )
  );

create policy claims_delete on claims
  for delete using (
    exists (
      select 1 from reports r
      where r.id = claims.report_id and r.author_id = auth.uid() and r.locked_at is null
    )
  );

-- ============================================================
-- Debate comments — scoped to a single claim, opinion-tier only
-- ============================================================
create table debate_comments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index debate_claim_idx on debate_comments (claim_id, created_at);

alter table debate_comments enable row level security;

-- Readable by anyone who can read the parent claim/report.
create policy debate_read on debate_comments
  for select using (
    exists (
      select 1 from claims c
      join reports r on r.id = c.report_id
      where c.id = debate_comments.claim_id
        and (r.status = 'published' or r.author_id = auth.uid())
    )
  );

-- Insertable by any authenticated user, but only on claims verdict = 'opinion'.
-- (Defense-in-depth: the primary UX-level explanation belongs server-side in
-- the API layer, but RLS checking the claim's verdict via subquery means a
-- direct client insert can't bypass the opinion-only restriction either.)
create policy debate_insert on debate_comments
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from claims c where c.id = claim_id and c.verdict = 'opinion')
  );

create policy debate_delete on debate_comments
  for delete using (author_id = auth.uid());


-- =============================================================================
-- BEGIN 0014_paypal_accounts.sql
-- =============================================================================
-- Creator payout onboarding via PayPal (Partner Referrals / Commerce Platform
-- for Marketplaces), not Stripe Connect — Stripe Connect payouts aren't
-- available for Israel-based platforms/sellers, PayPal is.
--
-- Unlike Stripe (which has a separate "Identity" product for KYC), PayPal
-- performs its own KYC during the seller's onboarding flow itself — signing
-- up for or logging into a PayPal account and granting the platform
-- permissions is the verification step. There's no separate identity table:
-- `profiles.identity_verified` is derived directly from PayPal's own
-- onboarding-completion signals (`payments_receivable` +
-- `primary_email_confirmed`), set by `upsert_paypal_account` below.
--
-- This is additive: the existing simulated wallet (top_up / purchase_report /
-- subscribe_to_analyst) keeps working unchanged. Once PAYPAL_CLIENT_ID /
-- PAYPAL_CLIENT_SECRET are configured (and the platform is approved by PayPal
-- for partner fees), real money flows can be layered in behind this table.

alter table profiles
  add column if not exists identity_verified boolean not null default false;

comment on column profiles.identity_verified is 'True once PayPal onboarding confirms payments_receivable + primary_email_confirmed for this creator (see paypal_accounts).';

create type paypal_account_status as enum ('pending', 'onboarding', 'restricted', 'active', 'rejected');

create table paypal_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  -- Our own id, sent to PayPal when the onboarding referral link is created.
  -- Needed to look the merchant up before paypal_merchant_id is known (it
  -- only exists once the seller actually completes onboarding).
  tracking_id text not null unique,
  -- Set once onboarding completes (from the MERCHANT.ONBOARDING.COMPLETED
  -- webhook, or a manual status poll via GET /v1/customer/partners/.../merchant-integrations).
  paypal_merchant_id text unique,
  status paypal_account_status not null default 'pending',
  payments_receivable boolean not null default false,
  primary_email_confirmed boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index paypal_accounts_user_idx on paypal_accounts (user_id);
create index paypal_accounts_tracking_idx on paypal_accounts (tracking_id);

alter table paypal_accounts enable row level security;

create policy paypal_accounts_read on paypal_accounts
  for select using (user_id = auth.uid());

create trigger paypal_accounts_updated_at before update on paypal_accounts
  for each row execute function set_updated_at();

-- Upserts PayPal account state from a status poll or the onboarding webhook,
-- keyed by tracking_id (stable from referral creation) rather than
-- paypal_merchant_id (only known after the seller completes onboarding).
-- Flips profiles.identity_verified + writes an audit row the moment both
-- payments_receivable and primary_email_confirmed become true.
create or replace function upsert_paypal_account(
  p_user_id uuid,
  p_tracking_id text,
  p_paypal_merchant_id text,
  p_payments_receivable boolean,
  p_primary_email_confirmed boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status paypal_account_status;
  v_was_active boolean;
begin
  v_status := case
    when p_payments_receivable and p_primary_email_confirmed then 'active'
    when p_paypal_merchant_id is not null then 'restricted'
    else 'onboarding'
  end;

  select (status = 'active') into v_was_active
  from paypal_accounts where tracking_id = p_tracking_id;

  insert into paypal_accounts (
    user_id, tracking_id, paypal_merchant_id, status,
    payments_receivable, primary_email_confirmed, onboarded_at
  )
  values (
    p_user_id, p_tracking_id, p_paypal_merchant_id, v_status,
    p_payments_receivable, p_primary_email_confirmed,
    case when v_status = 'active' then now() else null end
  )
  on conflict (tracking_id) do update set
    paypal_merchant_id = coalesce(excluded.paypal_merchant_id, paypal_accounts.paypal_merchant_id),
    status = excluded.status,
    payments_receivable = excluded.payments_receivable,
    primary_email_confirmed = excluded.primary_email_confirmed,
    onboarded_at = coalesce(paypal_accounts.onboarded_at, excluded.onboarded_at),
    updated_at = now();

  if v_status = 'active' then
    update profiles set identity_verified = true where id = p_user_id;
    if not coalesce(v_was_active, false) then
      perform log_audit(p_user_id, 'paypal.activated', 'paypal_account', p_user_id,
        jsonb_build_object('paypal_merchant_id', p_paypal_merchant_id));
    end if;
  end if;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC on new functions by default — explicitly
-- revoke it so this is unreachable via `supabase.rpc()` from the browser.
-- Only the service-role key (onboarding status route + the
-- MERCHANT.ONBOARDING.COMPLETED webhook handler) can call it.
revoke execute on function upsert_paypal_account(uuid, text, text, boolean, boolean) from public;

-- Convenience check used by application code before allowing a creator to
-- price a report/subscription for real-money checkout via PayPal.
create or replace function is_payout_ready(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from paypal_accounts
    where user_id = p_user_id and status = 'active'
  );
$$;

grant execute on function is_payout_ready(uuid) to authenticated;


-- =============================================================================
-- BEGIN 0015_score_breakdown.sql
-- =============================================================================
-- Persist the MOAT score breakdown on the profile so:
--   1. The analytics page can show hit rate / avg return / alpha without
--      recomputing from raw predictions on every page load.
--   2. The grading job can build a platform-wide alpha distribution cheaply
--      (one query over `profiles` instead of every analyst's full history)
--      to percentile-rank alpha instead of a fixed linear band.
--
-- Mirrors the "store hit_rate, avg_return, sample_size alongside score" rule
-- from the MOAT formula spec — the score should never read as a black box.

alter table profiles
  add column if not exists wilson_win_rate numeric,
  add column if not exists profit_factor numeric,
  add column if not exists avg_return numeric,
  add column if not exists avg_alpha numeric,
  add column if not exists sample_size int not null default 0;

comment on column profiles.wilson_win_rate is 'Wilson lower-bound win rate (0-1) from the last grading pass.';
comment on column profiles.profit_factor is 'Decay-weighted avg win / avg loss from the last grading pass.';
comment on column profiles.avg_return is 'Mean signed return % across resolved calls.';
comment on column profiles.avg_alpha is 'Mean excess return % vs SPY across resolved calls with a benchmark. Null until 5+ benchmarked calls exist.';
comment on column profiles.sample_size is 'Count of resolved calls the current score is based on.';

create index if not exists profiles_avg_alpha_idx on profiles (avg_alpha) where avg_alpha is not null;


-- =============================================================================
-- BEGIN 0016_platform_transfers.sql
-- =============================================================================
-- Real-money ledger scaffolding for PayPal marketplace payments.
--
-- The existing wallet/wallet_transactions system stays the live economy for
-- the demo (simulated deposits, atomic 90/10 splits via SQL functions). This
-- migration adds the parallel real-money rail without duplicating the
-- subscriptions/report_unlocks tables: a nullable PayPal id column is enough
-- to tag a row as "settled via PayPal" instead of "settled via wallet".
--
-- `platform_transfers` is the earnings ledger driven by PayPal webhooks —
-- every dollar that moves via PayPal gets exactly one row here, with the
-- platform fee always broken out explicitly. Never compute "what a creator
-- earned this month" by summing PayPal data live — read from this table.

alter table subscriptions
  add column if not exists paypal_subscription_id text unique;

alter table report_unlocks
  add column if not exists paypal_order_id text unique,
  add column if not exists amount_cents integer;

create table platform_transfers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id) on delete cascade,
  source_type text not null check (source_type in ('subscription', 'report_purchase')),
  source_id text not null,
  gross_amount_cents integer not null,
  platform_fee_cents integer not null,
  net_amount_cents integer not null,
  provider text not null default 'paypal',
  provider_transfer_id text,
  created_at timestamptz not null default now()
);

create index platform_transfers_creator_idx on platform_transfers (creator_id, created_at desc);

alter table platform_transfers enable row level security;

-- Owner reads only. Writes happen exclusively from the service-role webhook
-- handler (src/lib/paypal/webhooks.ts) — never from client code.
create policy platform_transfers_read on platform_transfers
  for select using (creator_id = auth.uid());


-- =============================================================================
-- BEGIN 0017_analyst_applications.sql
-- =============================================================================
-- Analyst application funnel.
-- Normal users submit an application → admin reviews and approves/rejects.
-- On approval the profile role is flipped to 'analyst'.

create type application_status as enum ('pending', 'approved', 'rejected');

create table analyst_applications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references profiles (id) on delete cascade,
  status            application_status not null default 'pending',

  -- Application form answers
  why_analyst       text not null,          -- Why do you want to publish?
  background        text not null,          -- Financial / professional background
  coverage_areas    text not null,          -- Markets / sectors you'll cover
  sample_thesis     text,                   -- Optional quick thesis
  linkedin_url      text,                   -- Optional LinkedIn URL

  -- Review metadata
  submitted_at      timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid references profiles (id),
  review_note       text
);

create index analyst_applications_status_idx on analyst_applications (status, submitted_at desc);
create index analyst_applications_user_idx   on analyst_applications (user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table analyst_applications enable row level security;

-- Users can view and create their own application
create policy "own application read"
  on analyst_applications for select
  using (user_id = auth.uid());

create policy "own application insert"
  on analyst_applications for insert
  with check (user_id = auth.uid());

-- Admins can read all and update (approve / reject)
create policy "admin read all"
  on analyst_applications for select
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

create policy "admin update"
  on analyst_applications for update
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- ── Approve function ────────────────────────────────────────────────────────
-- Called by an admin; sets application status + upgrades the profile role.
create or replace function approve_analyst_application(p_application_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id  uuid := auth.uid();
  v_app       analyst_applications%rowtype;
begin
  -- Must be admin
  if not exists (select 1 from profiles where id = v_admin_id and role = 'admin') then
    raise exception 'Not authorised';
  end if;

  select * into v_app from analyst_applications where id = p_application_id;
  if not found then raise exception 'Application not found'; end if;

  -- Update application
  update analyst_applications
  set status      = 'approved',
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      review_note = p_note
  where id = p_application_id;

  -- Upgrade profile role
  update profiles set role = 'analyst' where id = v_app.user_id;

  -- Notify the user
  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_app.user_id, v_admin_id, 'system',
          'Your analyst application has been approved 🎉 You can now publish research.',
          '/studio/compose');
end;
$$;

grant execute on function approve_analyst_application(uuid, text) to authenticated;

-- ── Reject function ─────────────────────────────────────────────────────────
create or replace function reject_analyst_application(p_application_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id  uuid := auth.uid();
  v_app       analyst_applications%rowtype;
begin
  if not exists (select 1 from profiles where id = v_admin_id and role = 'admin') then
    raise exception 'Not authorised';
  end if;

  select * into v_app from analyst_applications where id = p_application_id;
  if not found then raise exception 'Application not found'; end if;

  update analyst_applications
  set status      = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      review_note = p_note
  where id = p_application_id;

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_app.user_id, v_admin_id, 'system',
          coalesce('Your analyst application was not approved. ' || p_note, 'Your analyst application was not approved at this time.'),
          '/become-analyst');
end;
$$;

grant execute on function reject_analyst_application(uuid, text) to authenticated;

-- ── Immediately approve liorkr98@gmail.com ──────────────────────────────────
-- Run once; safe to re-run (do-nothing if user does not exist yet).
do $$
declare
  v_user_id uuid;
begin
  select p.id into v_user_id
  from profiles p
  join auth.users u on u.id = p.id
  where u.email = 'liorkr98@gmail.com'
  limit 1;

  if v_user_id is not null then
    update profiles set role = 'analyst' where id = v_user_id and role = 'user';
  end if;
end;
$$;


