-- A lapsed subscriber cannot pay again.
--
-- subscribe_to_analyst's guard checks `status = 'active'` and nothing else, so
-- it returns 'already_subscribed' for any row still marked active -- including
-- one whose renews_at is in the past. Rows are only flipped to 'expired' by
-- expire_subscriptions() (0003/0005), which runs on a schedule, so between a
-- subscription lapsing and the next sweep the function refuses the renewal and
-- the analyst loses the sale. The subscriber sees "already subscribed" while
-- having no access.
--
-- The fix is the guard, not the data: add `and renews_at > now()`, so only a
-- genuinely live subscription blocks a new purchase.
--
-- Deliberately writes nothing to existing rows. An earlier draft of this fix
-- also UPDATEd the lapsed row to 'expired' before the check, but that is
-- redundant -- the INSERT ... ON CONFLICT at the end of this same function
-- already revives the row (status = 'active', renews_at = now() + 30 days),
-- and expire_subscriptions() owns that bookkeeping everywhere else. On a
-- payments path, a guard change with no data migration is the smaller blast
-- radius. Body is otherwise byte-identical to 0003.

create or replace function subscribe_to_analyst(p_analyst_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_buyer uuid := auth.uid();
  v_price numeric(10, 2);
  v_cut numeric(12, 2);
  v_share numeric(12, 2);
  v_buyer_wallet wallets%rowtype;
  v_author_wallet_id uuid;
begin
  if v_buyer is null then raise exception 'not authenticated'; end if;
  if v_buyer = p_analyst_id then raise exception 'cannot subscribe to yourself'; end if;

  -- Only a subscription that has not yet lapsed blocks a new purchase.
  if exists (
    select 1 from subscriptions
    where subscriber_id = v_buyer
      and analyst_id = p_analyst_id
      and status = 'active'
      and renews_at > now()
  ) then
    return jsonb_build_object('status', 'already_subscribed');
  end if;

  select sub_price into v_price from profiles where id = p_analyst_id;
  if v_price is null or v_price <= 0 then raise exception 'analyst has no subscription price'; end if;

  select * into v_buyer_wallet from wallets where owner_id = v_buyer for update;
  if v_buyer_wallet.balance < v_price then raise exception 'insufficient balance'; end if;

  v_cut := round(v_price * 0.10, 2);
  v_share := v_price - v_cut;

  update wallets set balance = balance - v_price where owner_id = v_buyer;
  select id into v_author_wallet_id from wallets where owner_id = p_analyst_id for update;
  update wallets set balance = balance + v_share, earnings = earnings + v_share
    where id = v_author_wallet_id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_buyer_wallet.id, v_buyer, 'subscription', -v_price, p_analyst_id, 'Monthly subscription');

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_author_wallet_id, p_analyst_id, 'payout', v_share, p_analyst_id, 'Subscription (90%)');

  insert into subscriptions (subscriber_id, analyst_id, status, price)
  values (v_buyer, p_analyst_id, 'active', v_price)
  on conflict (subscriber_id, analyst_id)
  do update set status = 'active', price = excluded.price,
    started_at = now(), renews_at = now() + interval '30 days';

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (p_analyst_id, v_buyer, 'subscribe', 'You have a new subscriber', null);

  return jsonb_build_object(
    'status', 'subscribed',
    'spent', v_price,
    'platform_fee', v_cut,
    'author_share', v_share,
    'new_balance', v_buyer_wallet.balance - v_price
  );
end;
$$;
