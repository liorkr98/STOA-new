create table slack_bug_threads (
  id uuid primary key default gen_random_uuid(),
  slack_channel_id text not null,
  slack_message_ts text not null,
  sentry_issue_url text,
  message_preview text,
  status text not null default 'open' check (status in ('open', 'fixed', 'ignored')),
  fix_summary text,
  created_at timestamptz not null default now(),
  fixed_at timestamptz,
  unique (slack_channel_id, slack_message_ts)
);

create index slack_bug_threads_open_idx on slack_bug_threads (status, created_at desc)
  where status = 'open';

alter table slack_bug_threads enable row level security;

create policy slack_bug_threads_admin on slack_bug_threads
  for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
