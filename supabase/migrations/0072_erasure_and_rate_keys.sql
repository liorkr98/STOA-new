-- Bind authenticated rate-limit keys to the caller, and finish erasure of
-- private text that 0068 still left on comments, debate, and consent IPs.

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
  v_uid uuid := auth.uid();
  v_key text := p_rate_key;
  v_window timestamptz;
  v_count int;
begin
  if v_uid is not null then
    v_key := v_uid::text || ':' || p_rate_key;
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into api_rate_limits (rate_key, window_start, request_count)
  values (v_key, v_window, 1)
  on conflict (rate_key, window_start) do update
    set request_count = api_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;

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

  update comments set body = '[redacted]' where author_id = p_user_id;
  update debate_comments set body = '[redacted]' where author_id = p_user_id;
  update user_consents set ip_address = null where user_id = p_user_id;

  perform log_audit(p_user_id, 'user.pseudonymized', 'profile', p_user_id, '{}'::jsonb);
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated, service_role;
revoke all on function public.pseudonymize_user(uuid) from public, anon, authenticated;
grant execute on function public.pseudonymize_user(uuid) to service_role;
