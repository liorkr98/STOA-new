-- Notify admins when a new analyst application is submitted.

create or replace function notify_admins_new_analyst_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant_name text;
begin
  select display_name into v_applicant_name
  from profiles
  where id = new.user_id;

  insert into notifications (recipient_id, actor_id, kind, body, link)
  select
    admin.id,
    new.user_id,
    'system',
    'New analyst application from ' || coalesce(v_applicant_name, 'a user') || '.',
    '/admin/applications'
  from profiles admin
  where admin.role = 'admin';

  return new;
end;
$$;

drop trigger if exists analyst_application_notify_admins on analyst_applications;
create trigger analyst_application_notify_admins
after insert on analyst_applications
for each row execute function notify_admins_new_analyst_application();

-- Ensure primary operator can review applications in production.
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
    update profiles set role = 'admin' where id = v_user_id and role <> 'admin';
  end if;
end;
$$;

-- Send approved analysts to onboarding first (profile setup), not straight into compose.
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
  if not exists (select 1 from profiles where id = v_admin_id and role = 'admin') then
    raise exception 'Not authorised';
  end if;

  select * into v_app from analyst_applications where id = p_application_id;
  if not found then raise exception 'Application not found'; end if;

  update analyst_applications
  set status      = 'approved',
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      review_note = p_note
  where id = p_application_id;

  update profiles set role = 'analyst' where id = v_app.user_id;

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_app.user_id, v_admin_id, 'system',
          'Your analyst application has been approved. Set up your profile to publish research.',
          '/onboarding/analyst');
end;
$$;

grant execute on function approve_analyst_application(uuid, text) to authenticated;
