-- Public contact form submissions + admin inbox.

create type contact_topic as enum (
  'general',
  'support',
  'sales',
  'press',
  'accessibility',
  'other'
);

create type contact_status as enum ('new', 'read', 'archived');

create table contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  topic        contact_topic not null default 'general',
  subject      text not null,
  message      text not null,
  user_id      uuid references profiles (id) on delete set null,
  status       contact_status not null default 'new',
  submitted_at timestamptz not null default now()
);

create index contact_messages_status_idx on contact_messages (status, submitted_at desc);
create index contact_messages_email_idx on contact_messages (email, submitted_at desc);

alter table contact_messages enable row level security;

grant insert on contact_messages to anon, authenticated;
grant select, update on contact_messages to authenticated;

create policy "public insert contact"
  on contact_messages for insert
  to anon, authenticated
  with check (
    char_length(trim(name)) >= 1
    and char_length(trim(email)) >= 3
    and position('@' in trim(email)) > 1
    and char_length(trim(subject)) >= 1
    and char_length(trim(message)) >= 10
    and (
      user_id is null
      or user_id = (select auth.uid())
    )
  );

create policy "admin read contact"
  on contact_messages for select
  to authenticated
  using (exists (
    select 1 from profiles where id = (select auth.uid()) and role = 'admin'
  ));

create policy "admin update contact"
  on contact_messages for update
  to authenticated
  using (exists (
    select 1 from profiles where id = (select auth.uid()) and role = 'admin'
  ))
  with check (exists (
    select 1 from profiles where id = (select auth.uid()) and role = 'admin'
  ));

create or replace function notify_admins_new_contact_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (recipient_id, actor_id, kind, body, link)
  select
    admin.id,
    new.user_id,
    'system',
    'New contact from ' || new.name || ': ' || left(new.subject, 80),
    '/admin/contact?id=' || new.id::text
  from profiles admin
  where admin.role = 'admin';

  return new;
end;
$$;

grant execute on function check_rate_limit(text, int, int) to service_role;

drop trigger if exists contact_message_notify_admins on contact_messages;
create trigger contact_message_notify_admins
after insert on contact_messages
for each row execute function notify_admins_new_contact_message();
