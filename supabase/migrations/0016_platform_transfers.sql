-- Real-money ledger scaffolding for PayPal marketplace payments.
--
-- The existing wallet/wallet_transactions system stays the live economy for
-- the demo (simulated deposits, atomic 90/10 splits via SQL functions). This
-- migration adds the parallel real-money rail without duplicating the
-- subscriptions/report_unlocks tables: a nullable PayPal id column is enough
-- to tag a row as "settled via PayPal" instead of "settled via wallet".
--
-- `platform_transfers` is the earnings ledger driven by PayPal webhooks —
-- every dollar that moves via PayPal gets exactly one row here, with the
-- platform fee always broken out explicitly. Never compute "what a creator
-- earned this month" by summing PayPal data live — read from this table.

alter table subscriptions
  add column if not exists paypal_subscription_id text unique;

alter table report_unlocks
  add column if not exists paypal_order_id text unique,
  add column if not exists amount_cents integer;

create table platform_transfers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id) on delete cascade,
  source_type text not null check (source_type in ('subscription', 'report_purchase')),
  source_id text not null,
  gross_amount_cents integer not null,
  platform_fee_cents integer not null,
  net_amount_cents integer not null,
  provider text not null default 'paypal',
  provider_transfer_id text,
  created_at timestamptz not null default now()
);

create index platform_transfers_creator_idx on platform_transfers (creator_id, created_at desc);

alter table platform_transfers enable row level security;

-- Owner reads only. Writes happen exclusively from the service-role webhook
-- handler (src/lib/paypal/webhooks.ts) — never from client code.
create policy platform_transfers_read on platform_transfers
  for select using (creator_id = auth.uid());
