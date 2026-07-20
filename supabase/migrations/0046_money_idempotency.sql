-- Money idempotency (Scale-Hardening Section 1).
--
-- A flaky mobile connection can make the client retry a "purchase" or
-- "subscribe" whose response was lost. Without a guard that double-charges.
-- This adds a hard, Postgres-level guarantee (never Redis, which can evict):
-- a guard table keyed by (owner, client_request_id) whose PRIMARY KEY makes a
-- concurrent duplicate impossible, plus thin `*_idem` wrappers that delegate to
-- the existing money functions so the 90/10 math stays single-source.
--
-- Behaviour:
--   * First call with a key: claim the key, run the real function, store result.
--   * Retry with the same key: return the stored result, do NOT charge again.
--   * If the real function raises (e.g. insufficient balance): the whole tx
--     rolls back, releasing the key, so the client may legitimately retry.

create table if not exists money_idempotency (
  owner_id uuid not null references auth.users (id) on delete cascade,
  client_request_id uuid not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (owner_id, client_request_id)
);

create index if not exists money_idempotency_created_idx
  on money_idempotency (created_at);

alter table money_idempotency enable row level security;
-- No client policies: only SECURITY DEFINER functions touch this table.

-- Generic guard used by every wrapper. Returns the stored result on replay, or
-- null to signal "you hold the key, proceed". Raising inside the caller after a
-- successful claim rolls back the claim (desired: failed charge is retryable).
create or replace function money_idem_claim(p_owner uuid, p_key uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_existing jsonb;
begin
  begin
    insert into money_idempotency (owner_id, client_request_id) values (p_owner, p_key);
    return null; -- claimed; caller should proceed
  exception when unique_violation then
    select result into v_existing
      from money_idempotency
      where owner_id = p_owner and client_request_id = p_key;
    return coalesce(v_existing, jsonb_build_object('status', 'already_processed'));
  end;
end;
$$;

create or replace function money_idem_store(p_owner uuid, p_key uuid, p_result jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update money_idempotency set result = p_result
    where owner_id = p_owner and client_request_id = p_key;
end;
$$;

create or replace function purchase_report_idem(p_report_id uuid, p_client_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := auth.uid();
  v_replay jsonb;
  v_result jsonb;
begin
  if v_owner is null then raise exception 'not authenticated'; end if;
  if p_client_request_id is null then return purchase_report(p_report_id); end if;

  v_replay := money_idem_claim(v_owner, p_client_request_id);
  if v_replay is not null then return v_replay; end if;

  v_result := purchase_report(p_report_id);
  perform money_idem_store(v_owner, p_client_request_id, v_result);
  return v_result;
end;
$$;

create or replace function top_up_idem(p_amount numeric, p_client_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := auth.uid();
  v_replay jsonb;
  v_result jsonb;
begin
  if v_owner is null then raise exception 'not authenticated'; end if;
  if p_client_request_id is null then return top_up(p_amount); end if;

  v_replay := money_idem_claim(v_owner, p_client_request_id);
  if v_replay is not null then return v_replay; end if;

  v_result := top_up(p_amount);
  perform money_idem_store(v_owner, p_client_request_id, v_result);
  return v_result;
end;
$$;

create or replace function subscribe_to_analyst_idem(p_analyst_id uuid, p_client_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := auth.uid();
  v_replay jsonb;
  v_result jsonb;
begin
  if v_owner is null then raise exception 'not authenticated'; end if;
  if p_client_request_id is null then return subscribe_to_analyst(p_analyst_id); end if;

  v_replay := money_idem_claim(v_owner, p_client_request_id);
  if v_replay is not null then return v_replay; end if;

  v_result := subscribe_to_analyst(p_analyst_id);
  perform money_idem_store(v_owner, p_client_request_id, v_result);
  return v_result;
end;
$$;

create or replace function subscribe_to_plan_idem(p_plan_id uuid, p_client_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := auth.uid();
  v_replay jsonb;
  v_result jsonb;
begin
  if v_owner is null then raise exception 'not authenticated'; end if;
  if p_client_request_id is null then return subscribe_to_plan(p_plan_id); end if;

  v_replay := money_idem_claim(v_owner, p_client_request_id);
  if v_replay is not null then return v_replay; end if;

  v_result := subscribe_to_plan(p_plan_id);
  perform money_idem_store(v_owner, p_client_request_id, v_result);
  return v_result;
end;
$$;

revoke all on function money_idem_claim(uuid, uuid) from public;
revoke all on function money_idem_store(uuid, uuid, jsonb) from public;
grant execute on function purchase_report_idem(uuid, uuid) to authenticated;
grant execute on function top_up_idem(numeric, uuid) to authenticated;
grant execute on function subscribe_to_analyst_idem(uuid, uuid) to authenticated;
grant execute on function subscribe_to_plan_idem(uuid, uuid) to authenticated;

-- TTL cleanup: money idempotency keys are only useful for the retry window.
create or replace function cleanup_money_idempotency(p_older_than interval default interval '7 days')
returns int language plpgsql security definer set search_path = public as $$
declare v_deleted int;
begin
  delete from money_idempotency where created_at < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
