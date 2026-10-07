-- Security and privacy lockdown.
--
-- 1. Privileged SECURITY DEFINER functions were callable by anon because
--    Postgres grants EXECUTE to PUBLIC by default. Revoke, then grant back
--    only the documented RPCs.
-- 2. Partition children of video_view_events / engagement_events did not
--    inherit RLS enabled. Enable it, and make future partitions do the same.
-- 3. Demo top_up mints credits; disable it.
-- 4. Users may request erasure; they cannot approve it.
-- 5. Pseudonymize more than a display name.
-- 6. Pin search_path on trigger helpers the advisor flagged.

-- ── Partition RLS ────────────────────────────────────────────────────────────

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
    where n.nspname = 'public'
      and p.relname in ('video_view_events', 'engagement_events')
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

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
    execute format('alter table %I enable row level security', v_name);
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
  execute format('alter table %I enable row level security', v_name);
end;
$$;

create or replace function ensure_video_view_partitions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform create_video_view_partition(current_date);
  perform create_video_view_partition((current_date + interval '1 month')::date);
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
    execute format('alter table %I enable row level security', v_name);
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
  execute format('alter table %I enable row level security', v_name);
end;
$$;

create or replace function ensure_engagement_partitions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform create_engagement_partition(current_date);
  perform create_engagement_partition((current_date + interval '1 month')::date);
end;
$$;

-- Ready for counsel-approved retention; not invoked by cron until then.
create or replace function drop_old_video_view_partitions(p_retain_months int default 13)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_cutoff text := to_char(date_trunc('month', now()) - (p_retain_months || ' months')::interval, 'YYYYMM');
  v_dropped int := 0;
begin
  if p_retain_months < 1 then
    raise exception 'retain at least 1 month';
  end if;
  for r in
    select c.relname
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    where p.relname = 'video_view_events'
      and c.relname ~ '^video_view_events_[0-9]{6}$'
      and right(c.relname, 6) < v_cutoff
  loop
    execute format('drop table if exists %I', r.relname);
    v_dropped := v_dropped + 1;
  end loop;
  return v_dropped;
end;
$$;

select ensure_video_view_partitions();
select ensure_engagement_partitions();

-- ── dispatch_meta (public editorial singleton) ───────────────────────────────

alter table if exists dispatch_meta enable row level security;

drop policy if exists dispatch_meta_public_read on dispatch_meta;
create policy dispatch_meta_public_read on dispatch_meta
  for select using (true);

-- ── Deletion requests: user may open a ticket, never approve it ──────────────

drop policy if exists deletion_requests_self_insert on deletion_requests;
create policy deletion_requests_self_insert on deletion_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
  );

drop policy if exists deletion_requests_self_select on deletion_requests;
create policy deletion_requests_self_select on deletion_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

create unique index if not exists deletion_requests_one_pending
  on deletion_requests (user_id)
  where status = 'pending';

-- ── Broader pseudonymization (locked calls stay) ─────────────────────────────

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
    profile_config = null,
    marketing_opt_in = false,
    marketing_opt_in_at = null,
    identity_verified = false,
    verified = false
  where id = p_user_id;

  delete from paypal_accounts where user_id = p_user_id;
  delete from notifications where recipient_id = p_user_id or actor_id = p_user_id;
  delete from follows where follower_id = p_user_id or analyst_id = p_user_id;
  delete from saved_reports where user_id = p_user_id;
  delete from reports
    where author_id = p_user_id
      and locked_at is null
      and status = 'draft';

  update contact_messages
    set name = 'Deleted user',
        email = 'deleted@invalid',
        message = '[redacted]'
    where user_id = p_user_id;

  perform log_audit(p_user_id, 'user.pseudonymized', 'profile', p_user_id, '{}'::jsonb);
end;
$$;

-- ── Demo top-up is off ───────────────────────────────────────────────────────

create or replace function top_up(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'demo top-up is disabled';
end;
$$;

create or replace function top_up_idem(p_amount numeric, p_client_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'demo top-up is disabled';
end;
$$;

-- ── search_path on advisor-flagged helpers ───────────────────────────────────

do $$
declare
  r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'set_updated_at',
        'set_report_locked_at',
        'extract_chart_screenshot_urls',
        'perk_slug',
        'plan_has_required_perks',
        'set_report_locked_at_on_insert',
        'prevent_claim_edit_if_report_locked',
        'prevent_locked_body_edit',
        'prevent_locked_report_edit',
        'prevent_locked_report_delete',
        'predictions_read_only'
      )
  loop
    execute format(
      'alter function public.%I(%s) set search_path = public',
      r.proname, r.args
    );
  end loop;
end $$;

-- ── EXECUTE grants: fail closed ──────────────────────────────────────────────

alter default privileges in schema public revoke execute on functions from public;

do $$
declare
  r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format(
      'revoke all on function public.%I(%s) from public, anon, authenticated',
      r.proname, r.args
    );
    execute format(
      'grant execute on function public.%I(%s) to service_role',
      r.proname, r.args
    );
  end loop;
end $$;

grant execute on function public.ensure_user_profile() to authenticated;
grant execute on function public.cancel_subscription(uuid) to authenticated;
grant execute on function public.purchase_report(uuid) to authenticated;
grant execute on function public.purchase_report_idem(uuid, uuid) to authenticated;
grant execute on function public.subscribe_to_analyst(uuid) to authenticated;
grant execute on function public.subscribe_to_analyst_idem(uuid, uuid) to authenticated;
grant execute on function public.subscribe_to_plan(uuid) to authenticated;
grant execute on function public.subscribe_to_plan_idem(uuid, uuid) to authenticated;
grant execute on function public.spend_ai_credits(integer, text) to authenticated;
grant execute on function public.convert_to_ai_credits(numeric) to authenticated;
grant execute on function public.purchase_boost(text, text, uuid, integer, numeric) to authenticated;
grant execute on function public.is_payout_ready(uuid) to authenticated;
grant execute on function public.notify_follow(uuid) to authenticated;
grant execute on function public.notify_publication(uuid) to authenticated;
grant execute on function public.notify_report_event(uuid, text) to authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;
grant execute on function public.approve_analyst_application(uuid, text) to authenticated;
grant execute on function public.reject_analyst_application(uuid, text) to authenticated;

grant execute on function public.increment_views(uuid) to anon, authenticated;
grant execute on function public.can_read_report_body(uuid, uuid) to anon, authenticated;

-- RLS helpers used in policies must stay callable by the roles that hit them.
-- can_read_report_body is the paywall predicate.

-- ── Storage UPDATE WITH CHECK (cannot reassign another user's path) ──────────

drop policy if exists "own update avatars" on storage.objects;
create policy "own update avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own update covers" on storage.objects;
create policy "own update covers" on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own update report-images" on storage.objects;
create policy "own update report-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'report-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'report-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
