-- Boost polish: profile boosts hit sidebar + researchers; expire stale rows.

create or replace function expire_profile_boosts() returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update profile_boosts
  set status = 'expired'
  where status = 'active' and ends_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function purchase_boost(
  p_placement text,
  p_target_type text,
  p_target_id uuid,
  p_hours int,
  p_price numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet wallets%rowtype;
  v_boost_id uuid;
  v_tx_id uuid;
  v_ends timestamptz;
begin
  perform expire_profile_boosts();

  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_price <= 0 or p_hours <= 0 then
    raise exception 'invalid boost package';
  end if;

  if p_target_type = 'report' then
    if p_target_id is null then raise exception 'report required'; end if;
    if not exists (
      select 1 from reports where id = p_target_id and author_id = v_user and status = 'published'
    ) then
      raise exception 'report not found or not yours';
    end if;
  elsif p_target_type = 'profile' and p_target_id is not null then
    raise exception 'profile boost cannot have target_id';
  end if;

  select * into v_wallet from wallets where owner_id = v_user for update;
  if v_wallet.balance < p_price then
    return jsonb_build_object('error', 'insufficient_balance', 'have', v_wallet.balance, 'need', p_price);
  end if;

  update wallets set balance = balance - p_price where owner_id = v_user;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (
    v_wallet.id, v_user, 'boost', -p_price, p_target_id,
    format('Boost %s (%sh)', p_target_type, p_hours)
  )
  returning id into v_tx_id;

  v_ends := now() + (p_hours || ' hours')::interval;

  if p_target_type = 'profile' then
    insert into profile_boosts (creator_id, placement, target_type, target_id, ends_at, spend_amount, wallet_tx_id)
    values
      (v_user, 'discover_researchers', 'profile', null, v_ends, p_price, v_tx_id),
      (v_user, 'discover_sidebar', 'profile', null, v_ends, 0, v_tx_id)
    returning id into v_boost_id;
  else
    insert into profile_boosts (
      creator_id, placement, target_type, target_id, ends_at, spend_amount, wallet_tx_id
    )
    values (v_user, p_placement, p_target_type, p_target_id, v_ends, p_price, v_tx_id)
    returning id into v_boost_id;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'boost_id', v_boost_id,
    'new_balance', v_wallet.balance - p_price
  );
end;
$$;

grant execute on function expire_profile_boosts() to authenticated;
grant execute on function purchase_boost(text, text, uuid, int, numeric) to authenticated;
