-- New monthly partitions copy parent RLS policies, not only ENABLE RLS.

create or replace function create_video_view_partition(p_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name text := 'video_view_events_' || to_char(v_start, 'YYYYMM');
  v_exists boolean;
  v_overlap boolean;
begin
  select exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v_name
  ) into v_exists;
  if v_exists then
    perform apply_video_view_partition_rls(v_name);
    return;
  end if;

  select exists (
    select 1 from video_view_events_default
    where created_at >= v_start::timestamptz and created_at < v_end::timestamptz
  ) into v_overlap;

  if v_overlap then
    execute format(
      'create table %I (like video_view_events including defaults including constraints including indexes)',
      v_name
    );
    execute format(
      'insert into %I select * from video_view_events_default where created_at >= %L::timestamptz and created_at < %L::timestamptz',
      v_name, v_start, v_end
    );
    execute format(
      'delete from video_view_events_default where created_at >= %L::timestamptz and created_at < %L::timestamptz',
      v_start, v_end
    );
    execute format(
      'alter table video_view_events attach partition %I for values from (%L) to (%L)',
      v_name, v_start, v_end
    );
  else
    execute format(
      'create table %I partition of video_view_events for values from (%L) to (%L)',
      v_name, v_start, v_end
    );
  end if;
  perform apply_video_view_partition_rls(v_name);
end;
$$;

create or replace function create_engagement_partition(p_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name text := 'engagement_events_' || to_char(v_start, 'YYYYMM');
  v_exists boolean;
  v_overlap boolean;
begin
  select exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v_name
  ) into v_exists;
  if v_exists then
    perform apply_engagement_partition_rls(v_name);
    return;
  end if;

  select exists (
    select 1 from engagement_events_default
    where created_at >= v_start::timestamptz and created_at < v_end::timestamptz
  ) into v_overlap;

  if v_overlap then
    execute format(
      'create table %I (like engagement_events including defaults including constraints including indexes)',
      v_name
    );
    execute format(
      'insert into %I select * from engagement_events_default where created_at >= %L::timestamptz and created_at < %L::timestamptz',
      v_name, v_start, v_end
    );
    execute format(
      'delete from engagement_events_default where created_at >= %L::timestamptz and created_at < %L::timestamptz',
      v_start, v_end
    );
    execute format(
      'alter table engagement_events attach partition %I for values from (%L) to (%L)',
      v_name, v_start, v_end
    );
  else
    execute format(
      'create table %I partition of engagement_events for values from (%L) to (%L)',
      v_name, v_start, v_end
    );
  end if;
  perform apply_engagement_partition_rls(v_name);
end;
$$;

revoke all on function public.create_video_view_partition(date) from public, anon, authenticated;
revoke all on function public.create_engagement_partition(date) from public, anon, authenticated;
grant execute on function public.create_video_view_partition(date) to service_role;
grant execute on function public.create_engagement_partition(date) to service_role;
