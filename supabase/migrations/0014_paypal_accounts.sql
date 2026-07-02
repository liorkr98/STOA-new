-- Creator payout onboarding via PayPal (Partner Referrals / Commerce Platform
-- for Marketplaces), not Stripe Connect — Stripe Connect payouts aren't
-- available for Israel-based platforms/sellers, PayPal is.
--
-- Unlike Stripe (which has a separate "Identity" product for KYC), PayPal
-- performs its own KYC during the seller's onboarding flow itself — signing
-- up for or logging into a PayPal account and granting the platform
-- permissions is the verification step. There's no separate identity table:
-- `profiles.identity_verified` is derived directly from PayPal's own
-- onboarding-completion signals (`payments_receivable` +
-- `primary_email_confirmed`), set by `upsert_paypal_account` below.
--
-- This is additive: the existing simulated wallet (top_up / purchase_report /
-- subscribe_to_analyst) keeps working unchanged. Once PAYPAL_CLIENT_ID /
-- PAYPAL_CLIENT_SECRET are configured (and the platform is approved by PayPal
-- for partner fees), real money flows can be layered in behind this table.

alter table profiles
  add column if not exists identity_verified boolean not null default false;

comment on column profiles.identity_verified is 'True once PayPal onboarding confirms payments_receivable + primary_email_confirmed for this creator (see paypal_accounts).';

create type paypal_account_status as enum ('pending', 'onboarding', 'restricted', 'active', 'rejected');

create table paypal_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  -- Our own id, sent to PayPal when the onboarding referral link is created.
  -- Needed to look the merchant up before paypal_merchant_id is known (it
  -- only exists once the seller actually completes onboarding).
  tracking_id text not null unique,
  -- Set once onboarding completes (from the MERCHANT.ONBOARDING.COMPLETED
  -- webhook, or a manual status poll via GET /v1/customer/partners/.../merchant-integrations).
  paypal_merchant_id text unique,
  status paypal_account_status not null default 'pending',
  payments_receivable boolean not null default false,
  primary_email_confirmed boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index paypal_accounts_user_idx on paypal_accounts (user_id);
create index paypal_accounts_tracking_idx on paypal_accounts (tracking_id);

alter table paypal_accounts enable row level security;

create policy paypal_accounts_read on paypal_accounts
  for select using (user_id = auth.uid());

create trigger paypal_accounts_updated_at before update on paypal_accounts
  for each row execute function set_updated_at();

-- Upserts PayPal account state from a status poll or the onboarding webhook,
-- keyed by tracking_id (stable from referral creation) rather than
-- paypal_merchant_id (only known after the seller completes onboarding).
-- Flips profiles.identity_verified + writes an audit row the moment both
-- payments_receivable and primary_email_confirmed become true.
create or replace function upsert_paypal_account(
  p_user_id uuid,
  p_tracking_id text,
  p_paypal_merchant_id text,
  p_payments_receivable boolean,
  p_primary_email_confirmed boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status paypal_account_status;
  v_was_active boolean;
begin
  v_status := case
    when p_payments_receivable and p_primary_email_confirmed then 'active'
    when p_paypal_merchant_id is not null then 'restricted'
    else 'onboarding'
  end;

  select (status = 'active') into v_was_active
  from paypal_accounts where tracking_id = p_tracking_id;

  insert into paypal_accounts (
    user_id, tracking_id, paypal_merchant_id, status,
    payments_receivable, primary_email_confirmed, onboarded_at
  )
  values (
    p_user_id, p_tracking_id, p_paypal_merchant_id, v_status,
    p_payments_receivable, p_primary_email_confirmed,
    case when v_status = 'active' then now() else null end
  )
  on conflict (tracking_id) do update set
    paypal_merchant_id = coalesce(excluded.paypal_merchant_id, paypal_accounts.paypal_merchant_id),
    status = excluded.status,
    payments_receivable = excluded.payments_receivable,
    primary_email_confirmed = excluded.primary_email_confirmed,
    onboarded_at = coalesce(paypal_accounts.onboarded_at, excluded.onboarded_at),
    updated_at = now();

  if v_status = 'active' then
    update profiles set identity_verified = true where id = p_user_id;
    if not coalesce(v_was_active, false) then
      perform log_audit(p_user_id, 'paypal.activated', 'paypal_account', p_user_id,
        jsonb_build_object('paypal_merchant_id', p_paypal_merchant_id));
    end if;
  end if;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC on new functions by default — explicitly
-- revoke it so this is unreachable via `supabase.rpc()` from the browser.
-- Only the service-role key (onboarding status route + the
-- MERCHANT.ONBOARDING.COMPLETED webhook handler) can call it.
revoke execute on function upsert_paypal_account(uuid, text, text, boolean, boolean) from public;

-- Convenience check used by application code before allowing a creator to
-- price a report/subscription for real-money checkout via PayPal.
create or replace function is_payout_ready(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from paypal_accounts
    where user_id = p_user_id and status = 'active'
  );
$$;

grant execute on function is_payout_ready(uuid) to authenticated;
