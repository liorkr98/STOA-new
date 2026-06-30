-- AI credits economy + fact-check storage on reports.

alter type txn_type add value if not exists 'ai_spend';
alter type txn_type add value if not exists 'conversion';

alter table wallets
  add column if not exists ai_credits int not null default 50;

alter table wallet_transactions
  add column if not exists credits int;

alter table reports
  add column if not exists fact_check_results jsonb;

comment on column wallets.ai_credits is 'AI feature credits. $1 balance converts to 10 credits.';
comment on column reports.fact_check_results is 'JSON array of classified claims from fact-check run.';

-- Backfill welcome credits for existing wallets.
update wallets set ai_credits = 50 where ai_credits = 0;

-- Spend AI credits atomically. Returns new balance or error JSON.
create or replace function spend_ai_credits(p_credits int, p_memo text default 'AI usage')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet wallets%rowtype;
begin
  if v_user is null then
    return json_build_object('error', 'Not authenticated');
  end if;
  if p_credits is null or p_credits <= 0 then
    return json_build_object('error', 'Invalid credit amount');
  end if;

  select * into v_wallet from wallets where owner_id = v_user for update;
  if not found then
    return json_build_object('error', 'Wallet not found');
  end if;
  if v_wallet.ai_credits < p_credits then
    return json_build_object(
      'error', 'insufficient_credits',
      'have', v_wallet.ai_credits,
      'need', p_credits
    );
  end if;

  update wallets set ai_credits = ai_credits - p_credits where id = v_wallet.id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, credits, memo)
  values (v_wallet.id, v_user, 'ai_spend', 0, -p_credits, coalesce(p_memo, 'AI usage'));

  return json_build_object(
    'status', 'ok',
    'spent', p_credits,
    'remaining', v_wallet.ai_credits - p_credits
  );
end;
$$;

grant execute on function spend_ai_credits(int, text) to authenticated;

-- Convert wallet USD balance to AI credits ($1 = 10 credits).
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

  v_credits := floor(p_usd * 10);

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
