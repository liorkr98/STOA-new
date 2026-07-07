-- Reprice AI credits: $1 → 100 credits ($0.01/credit, ~93% gross margin on blended DeepSeek cost).
-- Scale existing balances so dollar value is preserved (legacy was 10 credits per $1).

comment on column wallets.ai_credits is 'AI feature credits. $1 balance converts to 100 credits.';

-- Preserve dollar value: old_balance * (100 / 10)
update wallets
set ai_credits = greatest(0, floor(ai_credits * 10.0))
where ai_credits > 0;

create or replace function convert_to_ai_credits(p_usd numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet wallets%rowtype;
  v_credits int;
  v_rate constant int := 100; -- keep in sync with AI_CREDITS_PER_DOLLAR in src/lib/ai/credits.ts
begin
  if v_user is null then
    return json_build_object('error', 'Not authenticated');
  end if;
  if p_usd is null or p_usd <= 0 or p_usd > 500 then
    return json_build_object('error', 'Amount must be between $0.01 and $500');
  end if;

  select * into v_wallet from wallets where owner_id = v_user for update;
  if v_wallet.balance < p_usd then
    return json_build_object('error', 'insufficient balance');
  end if;

  v_credits := floor(p_usd * v_rate);

  update wallets
  set balance = balance - p_usd,
      ai_credits = ai_credits + v_credits
  where id = v_wallet.id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, credits, memo)
  values (
    v_wallet.id, v_user, 'conversion', -p_usd, v_credits,
    format('Converted $%s to %s AI credits', p_usd, v_credits)
  );

  return json_build_object(
    'status', 'ok',
    'credits_added', v_credits,
    'new_balance', v_wallet.balance - p_usd,
    'new_credits', v_wallet.ai_credits + v_credits
  );
end;
$$;

grant execute on function convert_to_ai_credits(numeric) to authenticated;

-- New wallets: welcome grant = 500 credits ($5 at list price).
alter table wallets alter column ai_credits set default 500;
