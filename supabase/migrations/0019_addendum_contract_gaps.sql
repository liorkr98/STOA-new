-- Addendum #2 (motion/polish contract gaps): MOAT snapshots, trigram search,
-- platform aggregate stats, feed dismissals, referral attribution.

-- ── Must #1 — MOAT score snapshots (append-only, for odometer animation) ─────

create table moat_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id) on delete cascade,
  score int not null,
  sample_size int not null default 0,
  wilson_win_rate numeric,
  profit_factor numeric,
  avg_return numeric,
  avg_alpha numeric,
  breakdown jsonb,
  created_at timestamptz not null default now()
);

create index moat_score_snapshots_creator_created_idx
  on moat_score_snapshots (creator_id, created_at desc);

alter table moat_score_snapshots enable row level security;

create policy moat_snapshots_read on moat_score_snapshots
  for select using (true);

-- Service role inserts during grading; no client write policies.

-- Seed one snapshot per analyst that already has a score so the API is useful
-- before the next grading pass.
insert into moat_score_snapshots (
  creator_id, score, sample_size, wilson_win_rate, profit_factor, avg_return, avg_alpha, breakdown, created_at
)
select
  id,
  score,
  sample_size,
  wilson_win_rate,
  profit_factor,
  avg_return,
  avg_alpha,
  jsonb_build_object(
    'winRate', coalesce(round((wilson_win_rate * 100)::numeric), 0),
    'profitFactor', coalesce(round(profit_factor), 0),
    'alpha', null,
    'consistency', 100
  ),
  now()
from profiles
where role in ('analyst', 'admin') and sample_size > 0;

-- ── Must #2 — Postgres-native typeahead (pg_trgm) ────────────────────────────

create extension if not exists pg_trgm;

create index if not exists profiles_handle_trgm_idx
  on profiles using gin (handle gin_trgm_ops);

create index if not exists profiles_display_name_trgm_idx
  on profiles using gin (display_name gin_trgm_ops);

-- tickers table from 0018; `name` is the company name for search.
create index if not exists tickers_symbol_trgm_idx
  on tickers using gin (symbol gin_trgm_ops);

create index if not exists tickers_name_trgm_idx
  on tickers using gin (name gin_trgm_ops);

-- Ticker report counts for search ranking (published reports with a ticker).
create or replace view ticker_report_counts
with (security_invoker = true)
as
select ticker as symbol, count(*)::int as report_count
from reports
where status = 'published' and ticker is not null
group by ticker;

grant select on ticker_report_counts to anon, authenticated;

create or replace function search_platform(p_query text, p_limit int default 5)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select nullif(trim(p_query), '') as q, greatest(1, least(coalesce(p_limit, 5), 20)) as lim
  ),
  creator_rows as (
    select
      p.id,
      p.handle,
      p.display_name,
      p.avatar_url,
      p.score,
      p.followers_count,
      greatest(similarity(p.handle, pr.q), similarity(p.display_name, pr.q)) as sim
    from profiles p
    cross join params pr
    where pr.q is not null
      and p.role in ('analyst', 'admin')
      and (
        p.handle % pr.q
        or p.display_name % pr.q
        or p.handle ilike '%' || pr.q || '%'
        or p.display_name ilike '%' || pr.q || '%'
      )
    order by sim desc, p.followers_count desc, p.score desc
    limit (select lim from params)
  ),
  ticker_rows as (
    select
      t.symbol,
      t.name as company_name,
      t.sector,
      coalesce(trc.report_count, 0) as report_count,
      greatest(similarity(t.symbol, pr.q), similarity(t.name, pr.q)) as sim
    from tickers t
    cross join params pr
    left join ticker_report_counts trc on trc.symbol = t.symbol
    where pr.q is not null
      and t.status = 'active'
      and (
        t.symbol % pr.q
        or t.name % pr.q
        or t.symbol ilike '%' || pr.q || '%'
        or t.name ilike '%' || pr.q || '%'
      )
    order by sim desc, coalesce(trc.report_count, 0) desc, t.symbol
    limit (select lim from params)
  )
  select json_build_object(
    'creators', coalesce((select json_agg(to_jsonb(c)) from creator_rows c), '[]'::json),
    'tickers', coalesce((select json_agg(to_jsonb(t)) from ticker_rows t), '[]'::json)
  )
  from params;
$$;

grant execute on function search_platform(text, int) to anon, authenticated;

-- ── Should #3 — Platform trust-bar aggregates (materialized, not live count) ─

create materialized view platform_stats as
select
  (select count(*)::bigint from claims) as fact_checked_claims,
  (select count(*)::bigint from reports where locked_at is not null) as locked_calls_tracked,
  case
    when (select count(*) from claims) = 0 then null::numeric
    else round(
      100.0 * (select count(*) from claims where verdict <> 'unproven')
      / nullif((select count(*) from claims), 0),
      1
    )
  end as claims_verified_pct,
  now() as refreshed_at;

create unique index platform_stats_singleton_idx on platform_stats ((true));

grant select on platform_stats to anon, authenticated;

create or replace function refresh_platform_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently platform_stats;
exception
  when object_not_in_prerequisite_state then
    refresh materialized view platform_stats;
end;
$$;

-- Only the grading cron (service role) should refresh aggregates.
revoke all on function refresh_platform_stats() from public;
revoke execute on function refresh_platform_stats() from anon, authenticated;
grant execute on function refresh_platform_stats() to service_role;

-- Initial populate
refresh materialized view platform_stats;

-- ── Should #4 — Feed dismissal signal ────────────────────────────────────────

create table feed_dismissals (
  user_id uuid not null references profiles (id) on delete cascade,
  report_id uuid not null references reports (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, report_id)
);

create index feed_dismissals_user_idx on feed_dismissals (user_id, created_at desc);

alter table feed_dismissals enable row level security;

create policy feed_dismissals_select_own on feed_dismissals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy feed_dismissals_insert_own on feed_dismissals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ── Could #5 — Referral attribution (?ref=<handle> on signup) ────────────────

alter table profiles
  add column if not exists referred_by uuid references profiles (id) on delete set null;

create index if not exists profiles_referred_by_idx
  on profiles (referred_by)
  where referred_by is not null;

comment on column profiles.referred_by is
  'Analyst who referred this user via ?ref=<handle> at signup. One-touch attribution only.';

-- MOAT snapshots for two most recent rows (API helper).
create or replace function get_moat_snapshots(p_creator_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with ranked as (
    select
      score,
      sample_size,
      wilson_win_rate,
      profit_factor,
      avg_return,
      avg_alpha,
      breakdown,
      created_at,
      row_number() over (order by created_at desc) as rn
    from moat_score_snapshots
    where creator_id = p_creator_id
  )
  select json_build_object(
    'current',
      (select to_jsonb(r) - 'rn' from ranked r where rn = 1),
    'previous',
      (select to_jsonb(r) - 'rn' from ranked r where rn = 2)
  );
$$;

grant execute on function get_moat_snapshots(uuid) to anon, authenticated;
