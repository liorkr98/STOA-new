-- Performance: ticker coverage and call activity as grouped queries.
--
-- Today, the landing tape, Markets Explore and every ticker page were computing
-- these by pulling up to 2000 report rows (and 2000 prediction rows, and 4000
-- ticker rows) over the wire and counting them in Node, on every request.
-- Markets alone moved roughly 6000 report rows per page view because it ran
-- three coverage windows in parallel.
--
-- Postgres can group far faster than we can ship rows, so these do the counting
-- in the database and return one small row per ticker.

-- All-time published coverage per ticker.
create or replace function ticker_coverage_counts()
returns table (symbol text, report_count bigint)
language sql stable set search_path = public as $$
  select upper(r.ticker) as symbol, count(*) as report_count
  from reports r
  where r.status in ('published', 'resolution_pending_review')
    and r.ticker is not null
  group by upper(r.ticker)
  order by report_count desc;
$$;

-- Coverage inside a window, for the "this week vs last week" momentum figures.
-- Both bounds are optional so one function serves every caller.
create or replace function ticker_coverage_window(
  p_since timestamptz default null,
  p_until timestamptz default null
)
returns table (symbol text, report_count bigint)
language sql stable set search_path = public as $$
  select upper(r.ticker) as symbol, count(*) as report_count
  from reports r
  where r.status in ('published', 'resolution_pending_review')
    and r.ticker is not null
    and (p_since is null or r.published_at >= p_since)
    and (p_until is null or r.published_at < p_until)
  group by upper(r.ticker)
  order by report_count desc;
$$;

-- Distinct analysts and open-call lean per ticker, plus the first call date.
-- Replaces shipping 2000 prediction rows to be reduced in Node.
create or replace function ticker_call_activity()
returns table (
  symbol text,
  analysts bigint,
  long_open bigint,
  short_open bigint,
  first_at timestamptz
)
language sql stable set search_path = public as $$
  select
    upper(p.ticker) as symbol,
    count(distinct p.author_id) as analysts,
    count(*) filter (where p.outcome = 'open' and p.direction = 'long') as long_open,
    count(*) filter (where p.outcome = 'open' and p.direction = 'short') as short_open,
    min(p.created_at) as first_at
  from predictions p
  where p.ticker is not null
  group by upper(p.ticker);
$$;

-- Sector membership counts, replacing a 4000-row scan of `tickers`.
create or replace function sector_symbol_counts()
returns table (sector text, symbols bigint)
language sql stable set search_path = public as $$
  select t.sector, count(*) as symbols
  from tickers t
  where t.status = 'active' and t.sector is not null
  group by t.sector;
$$;

-- These read only already-public data (published reports, active tickers) and
-- are STABLE, so they are safe for anon.
grant execute on function ticker_coverage_counts() to anon, authenticated;
grant execute on function ticker_coverage_window(timestamptz, timestamptz) to anon, authenticated;
grant execute on function ticker_call_activity() to anon, authenticated;
grant execute on function sector_symbol_counts() to anon, authenticated;

-- Supports the grouped scans above.
create index if not exists reports_ticker_published_status_idx
  on reports (upper(ticker), status, published_at desc)
  where ticker is not null;

create index if not exists predictions_ticker_outcome_idx
  on predictions (upper(ticker), outcome);
