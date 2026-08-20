-- Landing activity line: counts, not 2000-row scans.
--
-- getTodayActivity was selecting up to 2000 report author_ids and 2000
-- resolved prediction ids just to count them in Node on every signed-out
-- homepage render.

create or replace function today_activity(p_since timestamptz)
returns table (publications bigint, analysts bigint, resolved bigint)
language sql stable set search_path = public as $$
  select
    (
      select count(*)::bigint
      from reports r
      where r.status in ('published', 'resolution_pending_review')
        and r.published_at >= p_since
    ) as publications,
    (
      select count(distinct r.author_id)::bigint
      from reports r
      where r.status in ('published', 'resolution_pending_review')
        and r.published_at >= p_since
    ) as analysts,
    (
      select count(*)::bigint
      from predictions p
      where p.outcome is distinct from 'open'
        and p.resolves_at >= p_since
    ) as resolved;
$$;

grant execute on function today_activity(timestamptz) to anon, authenticated;
