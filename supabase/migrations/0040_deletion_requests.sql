-- GDPR erasure request queue (§B.1). User-facing trigger withheld until legal sign-off;
-- admin approval executes pseudonymize_user from migration 0018.

create table if not exists deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'completed')),
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  completed_at timestamptz,
  notes text
);

create index if not exists deletion_requests_status_idx on deletion_requests (status, requested_at);

alter table deletion_requests enable row level security;

-- Users may not self-serve erasure yet; no insert policy for authenticated users.
create policy deletion_requests_admin_all on deletion_requests
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Admin-only: approve a pending erasure request and pseudonymize the profile.
create or replace function approve_deletion_request(p_request_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_status text;
begin
  if not exists (select 1 from profiles where id = p_admin_id and role = 'admin') then
    raise exception 'Admin only';
  end if;

  select user_id, status into v_user_id, v_status
  from deletion_requests where id = p_request_id for update;

  if v_user_id is null then
    raise exception 'Deletion request not found';
  end if;
  if v_status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  perform pseudonymize_user(v_user_id);

  update deletion_requests set
    status = 'completed',
    reviewed_by = p_admin_id,
    reviewed_at = now(),
    completed_at = now()
  where id = p_request_id;

  perform log_audit(
    p_admin_id,
    'user.erasure.completed',
    'deletion_request',
    p_request_id,
    jsonb_build_object('user_id', v_user_id)
  );
end;
$$;

revoke execute on function approve_deletion_request(uuid, uuid) from public;
