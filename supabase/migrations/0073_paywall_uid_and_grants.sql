-- Close remaining holes from the security review:
-- 1. can_read_report_body must ignore a caller-supplied uid except for service_role.
-- 2. increment_views only counts published reports.
-- 3. Event tables: insert/select only for anon and authenticated.

create or replace function can_read_report_body(p_report_id uuid, p_uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Anon and signed-in callers cannot probe another user's entitlements.
  if v_uid is null then
    if current_user not in ('postgres', 'service_role', 'supabase_admin') then
      v_uid := null;
    else
      v_uid := p_uid;
    end if;
  end if;

  return exists (
    select 1 from reports r
    where r.id = p_report_id
      and (
        (v_uid is not null and r.author_id = v_uid)
        or (
          r.status = 'published'
          and (
            r.access = 'free'
            or (
              r.access = 'paid'
              and v_uid is not null
              and (
                exists (
                  select 1 from report_unlocks u
                  where u.report_id = r.id and u.user_id = v_uid
                )
                or (
                  coalesce(r.members_included, false)
                  and exists (
                    select 1 from subscriptions s
                    where s.analyst_id = r.author_id
                      and s.subscriber_id = v_uid
                      and s.status = 'active'
                      and s.renews_at > now()
                  )
                )
              )
            )
            or (
              r.access = 'subscribers'
              and v_uid is not null
              and exists (
                select 1 from subscriptions s
                left join plans p on p.id = s.plan_id
                where s.analyst_id = r.author_id
                  and s.subscriber_id = v_uid
                  and s.status = 'active'
                  and s.renews_at > now()
                  and coalesce(p.rank, 0) >= r.min_plan_rank
                  and public.plan_has_required_perks(p.perks, r.required_perks)
              )
            )
          )
        )
      )
  );
end;
$$;

create or replace function increment_views(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update reports
    set views = views + 1
    where id = p_report_id
      and status = 'published';
end;
$$;

revoke all on function public.can_read_report_body(uuid, uuid) from public;
grant execute on function public.can_read_report_body(uuid, uuid) to anon, authenticated, service_role;
revoke all on function public.increment_views(uuid) from public;
grant execute on function public.increment_views(uuid) to anon, authenticated, service_role;

do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and (
        c.relname in ('video_view_events', 'engagement_events')
        or c.relname ~ '^(video_view_events|engagement_events)_'
      )
  loop
    execute format(
      'revoke delete, update, truncate, references, trigger on table public.%I from anon, authenticated',
      r.relname
    );
    if r.relname like 'engagement_events%' then
      execute format('grant insert on table public.%I to anon, authenticated', r.relname);
    else
      execute format('grant insert, select on table public.%I to anon, authenticated', r.relname);
    end if;
  end loop;
end $$;
