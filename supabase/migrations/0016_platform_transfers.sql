-- Real-money ledger scaffolding for Stripe Connect.
--
-- The existing wallet/wallet_transactions system stays the live economy for
-- the demo (simulated deposits, atomic 90/10 splits via SQL functions). This
-- migration adds the parallel real-money rail without duplicating the
-- subscriptions/report_unlocks tables: a nullable Stripe id column is enough
-- to tag a row as "settled via Stripe" instead of "settled via wallet".
--
-- `platform_transfers` is the earnings ledger driven by Stripe webhooks —
-- every dollar that moves via Stripe gets exactly one row here, with the
-- platform fee always broken out explicitly. Never compute "what a creator
-- earned this month" by summing Stripe data live — read from this table.

alter table subscriptions
  add column if not exists stripe_subscription_id text unique;

alter table report_unlocks
  add column if not exists stripe_payment_intent_id text unique,
  add column if not exists amount_cents integer;

create table platform_transfers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id) on delete cascade,
  source_type text not null check (source_type in ('subscription', 'report_purchase')),
  source_id text not null,
  gross_amount_cents integer not null,
  platform_fee_cents integer not null,
  net_amount_cents integer not null,
  stripe_transfer_id text,
  created_at timestamptz not null default now()
);

create index platform_transfers_creator_idx on platform_transfers (creator_id, created_at desc);

alter table platform_transfers enable row level security;

-- Owner reads only. Writes happen exclusively from the service-role webhook
-- handler (src/lib/stripe/webhooks.ts) — never from client code.
create policy platform_transfers_read on platform_transfers
  for select using (creator_id = auth.uid());
