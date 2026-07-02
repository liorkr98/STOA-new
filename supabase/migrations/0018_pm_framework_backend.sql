-- PM framework review (Must/Should): horizon validation support, resolution edge cases,
-- ticker metadata, webhook idempotency, GDPR pseudonymization helper.

-- §3 — report stuck when market data unavailable
alter type report_status add value if not exists 'resolution_pending_review';

-- §9 — delisted/acquired tickers resolve neutral, excluded from MOAT
alter type outcome add value if not exists 'neutral';

-- §3/§4 — per-ticker exchange timezone + lifecycle status
create table tickers (
  symbol text primary key,
  name text not null,
  sector text,
  exchange text not null default 'NYSE',
  timezone text not null default 'America/New_York',
  status text not null default 'active' check (status in ('active', 'delisted', 'acquired')),
  updated_at timestamptz not null default now()
);

create index tickers_status_idx on tickers (status);

alter table tickers enable row level security;
create policy tickers_read on tickers for select using (true);

insert into tickers (symbol, name, sector, exchange, timezone) values
  ('NVDA', 'NVIDIA', 'Semiconductors', 'NASDAQ', 'America/New_York'),
  ('AAPL', 'Apple', 'Hardware', 'NASDAQ', 'America/New_York'),
  ('MSFT', 'Microsoft', 'Software', 'NASDAQ', 'America/New_York'),
  ('TSLA', 'Tesla', 'Autos', 'NASDAQ', 'America/New_York'),
  ('AMZN', 'Amazon', 'Consumer', 'NASDAQ', 'America/New_York'),
  ('GOOGL', 'Alphabet', 'Internet', 'NASDAQ', 'America/New_York'),
  ('META', 'Meta Platforms', 'Internet', 'NASDAQ', 'America/New_York'),
  ('AMD', 'Advanced Micro Devices', 'Semiconductors', 'NASDAQ', 'America/New_York'),
  ('JPM', 'JPMorgan Chase', 'Financials', 'NYSE', 'America/New_York'),
  ('XOM', 'Exxon Mobil', 'Energy', 'NYSE', 'America/New_York'),
  ('PLTR', 'Palantir', 'Software', 'NYSE', 'America/New_York'),
  ('COIN', 'Coinbase', 'Financials', 'NASDAQ', 'America/New_York')
on conflict (symbol) do nothing;

-- §1 — explicit horizon date (bare date, interpreted in tickers.timezone at resolution)
alter table predictions
  add column if not exists target_horizon_date date,
  add column if not exists resolution_trading_date date;

comment on column predictions.target_horizon_date is
  'Last calendar day of the call horizon in the primary listing exchange timezone.';
comment on column predictions.resolution_trading_date is
  'Actual trading session date used for resolution (may differ when horizon falls on weekend/holiday).';

-- §5 — PayPal/Stripe webhook idempotency (provider-agnostic)
create table processed_webhook_events (
  provider text not null,
  event_id text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

alter table processed_webhook_events enable row level security;
-- No client policies — service role only.

-- §7 — fact-check rate limiting (20/hour/creator)
create table api_rate_limits (
  rate_key text not null,
  window_start timestamptz not null,
  request_count int not null default 1,
  primary key (rate_key, window_start)
);

alter table api_rate_limits enable row level security;

create or replace function check_rate_limit(
  p_rate_key text,
  p_window_seconds int,
  p_max_requests int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count int;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into api_rate_limits (rate_key, window_start, request_count)
  values (p_rate_key, v_window, 1)
  on conflict (rate_key, window_start) do update
    set request_count = api_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;

revoke execute on function check_rate_limit(text, int, int) from public;
grant execute on function check_rate_limit(text, int, int) to authenticated;

-- §6 — GDPR pseudonymization (legal sign-off required before production use)
create or replace function pseudonymize_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
begin
  v_handle := 'deleted_' || substr(p_user_id::text, 1, 8);

  update profiles set
    handle = v_handle,
    display_name = 'Deleted user',
    avatar_url = null,
    cover_url = null,
    bio = null,
    headline = null,
    profile_config = null
  where id = p_user_id;

  perform log_audit(p_user_id, 'user.pseudonymized', 'profile', p_user_id, '{}'::jsonb);
end;
$$;

revoke execute on function pseudonymize_user(uuid) from public;
