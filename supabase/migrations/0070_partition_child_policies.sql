-- Copy parent RLS policies onto partition children. Postgres does not
-- materialize parent policies on each child; PostgREST can address children
-- directly, so they need the same predicates as the parent.

create or replace function apply_video_view_partition_rls(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('alter table %I enable row level security', p_name);
  execute format('drop policy if exists video_view_events_insert on %I', p_name);
  execute format(
    'create policy video_view_events_insert on %I for insert with check (viewer_id is null or viewer_id = auth.uid())',
    p_name
  );
  execute format('drop policy if exists video_view_events_owner_read on %I', p_name);
  execute format(
    'create policy video_view_events_owner_read on %I for select using (
      exists (select 1 from video_clips v where v.id = %I.video_id and v.creator_id = auth.uid())
      or exists (select 1 from profiles p where p.id = auth.uid() and p.role = ''admin'')
    )',
    p_name, p_name
  );
end;
$$;

create or replace function apply_engagement_partition_rls(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('alter table %I enable row level security', p_name);
  execute format('drop policy if exists engagement_events_insert on %I', p_name);
  execute format(
    'create policy engagement_events_insert on %I for insert with check (actor_id is null or actor_id = auth.uid())',
    p_name
  );
end;
$$;

revoke all on function public.apply_video_view_partition_rls(text) from public, anon, authenticated;
revoke all on function public.apply_engagement_partition_rls(text) from public, anon, authenticated;
grant execute on function public.apply_video_view_partition_rls(text) to service_role;
grant execute on function public.apply_engagement_partition_rls(text) to service_role;

do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    join pg_namespace n on n.oid = p.relnamespace
    where n.nspname = 'public' and p.relname = 'video_view_events'
  loop
    perform apply_video_view_partition_rls(r.relname);
  end loop;

  for r in
    select c.relname
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    join pg_namespace n on n.oid = p.relnamespace
    where n.nspname = 'public' and p.relname = 'engagement_events'
  loop
    perform apply_engagement_partition_rls(r.relname);
  end loop;
end $$;
