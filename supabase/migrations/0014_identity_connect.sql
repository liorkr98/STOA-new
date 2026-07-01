-- Identity verification (Stripe Identity) + creator payout accounts
-- (Stripe Connect Express). Schema-only scaffolding: these tables are written
-- to exclusively by server code holding the Stripe secret key (route handlers
-- + webhook handlers using the service-role Supabase client), never directly
-- by the browser — hence no client insert/update policies below.
--
-- This is additive: the existing simulated wallet (top_up / purchase_report /
-- subscribe_to_analyst) keeps working unchanged. Once STRIPE_SECRET_KEY is
-- configured, real money flows can be layered in behind these tables without
-- another schema migration.

alter table profiles
  add column if not exists identity_verified boolean not null default false;

comment on column profiles.identity_verified is 'True once Stripe Identity has confirmed this is a real person (KYC — separate from Connect banking onboarding).';

-- ============================================================
-- Identity verification sessions
-- ============================================================
create type identity_verification_status as enum ('pending', 'verified', 'failed', 'expired');

create table identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  provider text not null default 'stripe_identity',
  provider_session_id text not null unique,
  status identity_verification_status not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index identity_verifications_user_idx on identity_verifications (user_id, created_at desc);

alter table identity_verifications enable row level security;

create policy identity_verifications_read on identity_verifications
  for select using (user_id = auth.uid());

-- Flip profiles.identity_verified + write an audit row the moment a session
-- is marked verified. Called from the service-role webhook handler.
create or replace function mark_identity_verified(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid;
begin
  update identity_verifications
  set status = 'verified', verified_at = now()
  where provider_session_id = p_session_id
  returning user_id into v_user;

  if v_user is not null then
    update profiles set identity_verified = true where id = v_user;
    perform log_audit(v_user, 'identity.verified', 'identity_verification', v_user,
      jsonb_build_object('provider_session_id', p_session_id));
  end if;
end;
$$;

-- Explicitly revoke the default PUBLIC execute grant — Postgres grants it
-- automatically on function creation, and PostgREST/`supabase.rpc()` would
-- otherwise let any authenticated user mark themselves verified without ever
-- touching Stripe. Only the service-role key (which bypasses grants
-- entirely) can call this, from the Stripe Identity webhook handler.
revoke execute on function mark_identity_verified(text) from public;

-- ============================================================
-- Connect accounts (Stripe Connect Express — creator payouts)
-- ============================================================
create type connect_account_status as enum (
  'pending', 'onboarding', 'restricted', 'active', 'rejected', 'deactivated'
);

create table connect_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  stripe_account_id text not null unique,
  status connect_account_status not null default 'pending',
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  requirements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index connect_accounts_user_idx on connect_accounts (user_id);

alter table connect_accounts enable row level security;

create policy connect_accounts_read on connect_accounts
  for select using (user_id = auth.uid());

create trigger connect_accounts_updated_at before update on connect_accounts
  for each row execute function set_updated_at();

-- Upserts Connect account state from a Stripe `account.updated` webhook, and
-- flips status to 'active' only once both charges + payouts are enabled.
create or replace function upsert_connect_account(
  p_user_id uuid,
  p_stripe_account_id text,
  p_charges_enabled boolean,
  p_payouts_enabled boolean,
  p_details_submitted boolean,
  p_requirements jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status connect_account_status;
  v_was_active boolean;
begin
  v_status := case
    when p_charges_enabled and p_payouts_enabled then 'active'
    when p_details_submitted then 'restricted'
    else 'onboarding'
  end;

  select (status = 'active') into v_was_active
  from connect_accounts where stripe_account_id = p_stripe_account_id;

  insert into connect_accounts (
    user_id, stripe_account_id, status, charges_enabled, payouts_enabled,
    details_submitted, requirements
  )
  values (
    p_user_id, p_stripe_account_id, v_status, p_charges_enabled, p_payouts_enabled,
    p_details_submitted, coalesce(p_requirements, '[]'::jsonb)
  )
  on conflict (stripe_account_id) do update set
    status = excluded.status,
    charges_enabled = excluded.charges_enabled,
    payouts_enabled = excluded.payouts_enabled,
    details_submitted = excluded.details_submitted,
    requirements = excluded.requirements,
    updated_at = now();

  if v_status = 'active' and not coalesce(v_was_active, false) then
    perform log_audit(p_user_id, 'connect.activated', 'connect_account', p_user_id,
      jsonb_build_object('stripe_account_id', p_stripe_account_id));
  end if;
end;
$$;

-- Same reasoning as mark_identity_verified above: revoke the default PUBLIC
-- execute grant so this is unreachable via `supabase.rpc()` from the browser.
-- Only the service-role key (Connect onboarding route + `account.updated`
-- webhook handler) can call it.
revoke execute on function upsert_connect_account(uuid, text, boolean, boolean, boolean, jsonb) from public;

-- Convenience check used by application code before allowing a creator to
-- price a report/subscription for real-money checkout via Stripe.
create or replace function is_payout_ready(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from connect_accounts
    where user_id = p_user_id and status = 'active'
  );
$$;

grant execute on function is_payout_ready(uuid) to authenticated;
