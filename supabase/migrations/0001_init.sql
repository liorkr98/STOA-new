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
