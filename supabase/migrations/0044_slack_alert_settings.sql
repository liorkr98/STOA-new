-- Per-alert delivery mode (immediate, daily digest, or off) + digest queue.

create table slack_alert_settings (
  alert_key text primary key,
  delivery text not null check (delivery in ('immediate', 'digest', 'off')),
  updated_at timestamptz not null default now()
);

create table slack_alert_digest_queue (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null,
  channel text not null check (
    channel in ('support', 'customers-ops', 'revenue', 'marketing', 'bugs', 'ops')
  ),
  summary_text text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now(),
  digested_at timestamptz
);

create index slack_alert_digest_queue_pending_idx
  on slack_alert_digest_queue (channel, created_at)
  where digested_at is null;

alter table slack_alert_settings enable row level security;
alter table slack_alert_digest_queue enable row level security;

create policy slack_alert_settings_admin on slack_alert_settings
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into slack_alert_settings (alert_key, delivery) values
  ('customer_contact', 'immediate'),
  ('analyst_application', 'immediate'),
  ('report_purchase', 'digest'),
  ('creator_paypal_onboarded', 'digest'),
  ('new_signup', 'digest'),
  ('report_published', 'digest'),
  ('cron_failure', 'immediate'),
  ('cron_success', 'immediate'),
  ('paypal_webhook_error', 'immediate');
