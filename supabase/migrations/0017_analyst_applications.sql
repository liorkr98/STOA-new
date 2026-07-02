-- Analyst application funnel.
-- Normal users submit an application → admin reviews and approves/rejects.
-- On approval the profile role is flipped to 'analyst'.

create type application_status as enum ('pending', 'approved', 'rejected');

create table analyst_applications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references profiles (id) on delete cascade,
  status            application_status not null default 'pending',

  -- Application form answers
  why_analyst       text not null,          -- Why do you want to publish?
  background        text not null,          -- Financial / professional background
  coverage_areas    text not null,          -- Markets / sectors you'll cover
  sample_thesis     text,                   -- Optional quick thesis
  linkedin_url      text,                   -- Optional LinkedIn URL

  -- Review metadata
  submitted_at      timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid references profiles (id),
  review_note       text
);

create index analyst_applications_status_idx on analyst_applications (status, submitted_at desc);
create index analyst_applications_user_idx   on analyst_applications (user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table analyst_applications enable row level security;

-- Users can view and create their own application
create policy "own application read"
  on analyst_applications for select
  using (user_id = auth.uid());

create policy "own application insert"
  on analyst_applications for insert
  with check (user_id = auth.uid());

-- Admins can read all and update (approve / reject)
create policy "admin read all"
  on analyst_applications for select
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

create policy "admin update"
  on analyst_applications for update
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- ── Approve function ────────────────────────────────────────────────────────
-- Called by an admin; sets application status + upgrades the profile role.
create or replace function approve_analyst_application(p_application_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id  uuid := auth.uid();
  v_app       analyst_applications%rowtype;
begin
  -- Must be admin
  if not exists (select 1 from profiles where id = v_admin_id and role = 'admin') then
    raise exception 'Not authorised';
  end if;

  select * into v_app from analyst_applications where id = p_application_id;
  if not found then raise exception 'Application not found'; end if;

  -- Update application
  update analyst_applications
  set status      = 'approved',
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      review_note = p_note
  where id = p_application_id;

  -- Upgrade profile role
  update profiles set role = 'analyst' where id = v_app.user_id;

  -- Notify the user
  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_app.user_id, v_admin_id, 'system',
          'Your analyst application has been approved 🎉 You can now publish research.',
          '/studio/compose');
end;
$$;

grant execute on function approve_analyst_application(uuid, text) to authenticated;

-- ── Reject function ─────────────────────────────────────────────────────────
create or replace function reject_analyst_application(p_application_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id  uuid := auth.uid();
  v_app       analyst_applications%rowtype;
begin
  if not exists (select 1 from profiles where id = v_admin_id and role = 'admin') then
    raise exception 'Not authorised';
  end if;

  select * into v_app from analyst_applications where id = p_application_id;
  if not found then raise exception 'Application not found'; end if;

  update analyst_applications
  set status      = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      review_note = p_note
  where id = p_application_id;

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_app.user_id, v_admin_id, 'system',
          coalesce('Your analyst application was not approved. ' || p_note, 'Your analyst application was not approved at this time.'),
          '/become-analyst');
end;
$$;

grant execute on function reject_analyst_application(uuid, text) to authenticated;

-- ── Immediately approve liorkr98@gmail.com ──────────────────────────────────
-- Run once; safe to re-run (do-nothing if user does not exist yet).
do $$
declare
  v_user_id uuid;
begin
  select p.id into v_user_id
  from profiles p
  join auth.users u on u.id = p.id
  where u.email = 'liorkr98@gmail.com'
  limit 1;

  if v_user_id is not null then
    update profiles set role = 'analyst' where id = v_user_id and role = 'user';
  end if;
end;
$$;
