-- Profile & report boost placements (Discover promotion).

alter type txn_type add value if not exists 'boost';

create table if not exists profile_boosts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id) on delete cascade,
  placement text not null check (placement in ('discover_researchers', 'discover_sidebar', 'feed_trending')),
  target_type text not null check (target_type in ('profile', 'report')),
  target_id uuid references reports (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  spend_amount numeric(10, 2) not null,
  wallet_tx_id uuid references wallet_transactions (id),
  created_at timestamptz not null default now(),
  constraint profile_boost_target check (
    (target_type = 'profile' and target_id is null)
    or (target_type = 'report' and target_id is not null)
  )
);

create index if not exists profile_boosts_active_placement_idx
  on profile_boosts (placement, ends_at desc)
  where status = 'active';

alter table profile_boosts enable row level security;

create policy "Creators read own boosts"
  on profile_boosts for select
  using (auth.uid() = creator_id);

create policy "Anyone reads active boosts"
  on profile_boosts for select
  using (status = 'active' and ends_at > now());

-- Debit wallet and create boost row atomically.
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
begin
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

  insert into profile_boosts (
    creator_id, placement, target_type, target_id, ends_at, spend_amount, wallet_tx_id
  )
  values (
    v_user, p_placement, p_target_type, p_target_id,
    now() + (p_hours || ' hours')::interval,
    p_price, v_tx_id
  )
  returning id into v_boost_id;

  return jsonb_build_object(
    'status', 'ok',
    'boost_id', v_boost_id,
    'new_balance', v_wallet.balance - p_price
  );
end;
$$;

grant execute on function purchase_boost(text, text, uuid, int, numeric) to authenticated;
