-- Allow investors to cancel an active subscription (no refund; access until renews_at).

create or replace function cancel_subscription(p_analyst_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscriber_id uuid := auth.uid();
  v_row subscriptions%rowtype;
begin
  if v_subscriber_id is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  select * into v_row
  from subscriptions
  where subscriber_id = v_subscriber_id
    and analyst_id = p_analyst_id
    and status = 'active'
  limit 1;

  if not found then
    return json_build_object('error', 'No active subscription');
  end if;

  update subscriptions
  set status = 'cancelled'
  where id = v_row.id;

  return json_build_object('status', 'cancelled', 'renews_at', v_row.renews_at);
end;
$$;

grant execute on function cancel_subscription(uuid) to authenticated;
