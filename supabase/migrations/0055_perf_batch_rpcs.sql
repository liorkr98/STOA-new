-- Performance: batch RPCs for Discover/Search resolved-call counts and the
-- Markets "newly called" band.
--
-- resolvedCountByAuthor was 1 count query per analyst card (up to 24 on
-- Discover Researchers, plus however many Search returned). first_calls_recent
-- replaces shipping 2000 prediction rows to find the earliest call per ticker.

create or replace function resolved_counts_by_authors(p_ids uuid[])
returns table (author_id uuid, resolved_count bigint)
language sql stable set search_path = public as $$
  select p.author_id, count(*)::bigint as resolved_count
  from predictions p
  where p.author_id = any(p_ids)
    and p.outcome is distinct from 'open'
  group by p.author_id;
$$;

create or replace function first_calls_recent(p_limit int default 8)
returns table (
  symbol text,
  direction text,
  called_at timestamptz,
  report_id uuid,
  author_id uuid
)
language sql stable set search_path = public as $$
  select symbol, direction, called_at, report_id, author_id
  from (
    select distinct on (upper(p.ticker))
      upper(p.ticker) as symbol,
      p.direction::text as direction,
      p.created_at as called_at,
      p.report_id,
      p.author_id
    from predictions p
    where p.ticker is not null
    order by upper(p.ticker), p.created_at asc
  ) firsts
  order by called_at desc
  limit greatest(coalesce(p_limit, 8), 0);
$$;

create index if not exists predictions_ticker_created_idx
  on predictions (upper(ticker), created_at)
  where ticker is not null;

create index if not exists predictions_author_resolved_idx
  on predictions (author_id)
  where outcome is distinct from 'open';

grant execute on function resolved_counts_by_authors(uuid[]) to anon, authenticated;
grant execute on function first_calls_recent(int) to anon, authenticated;
