-- Allow deleting draft reports that have a prediction row (cascade), and tighten
-- published-report protection. Seed scripts that INSERT published rows directly
-- used to skip locked_at, leaving a loophole where report DELETE succeeded but
-- prediction DELETE was blocked.

-- Backfill any published rows that never received locked_at.
update reports
set locked_at = coalesce(locked_at, published_at, created_at, now())
where status in ('published', 'resolution_pending_review')
  and locked_at is null;

-- Set locked_at on INSERT when status is already published (seed / admin paths).
create or replace function set_report_locked_at_on_insert()
returns trigger language plpgsql as $$
begin
  if NEW.status in ('published', 'resolution_pending_review') and NEW.locked_at is null then
    NEW.locked_at := coalesce(NEW.published_at, now());
  end if;
  return NEW;
end;
$$;

drop trigger if exists set_locked_at_on_insert on reports;
create trigger set_locked_at_on_insert
before insert on reports
for each row execute function set_report_locked_at_on_insert();

-- Block hard deletes of anything on the public record (locked or published/archived).
create or replace function prevent_locked_report_delete()
returns trigger language plpgsql as $$
begin
  if OLD.locked_at is not null
     or OLD.status in ('published', 'archived', 'resolution_pending_review') then
    raise exception 'Locked reports cannot be deleted, only archived.';
  end if;
  return OLD;
end;
$$;

-- Predictions may be removed only with an unlocked draft parent, or during demo purge.
create or replace function prevent_prediction_delete()
returns trigger language plpgsql as $$
declare
  v_locked timestamptz;
  v_status report_status;
begin
  if current_setting('app.allow_prediction_delete', true) = 'true' then
    return OLD;
  end if;

  select locked_at, status into v_locked, v_status
  from reports where id = OLD.report_id;

  if v_locked is null and v_status = 'draft' then
    return OLD;
  end if;

  raise exception 'Calls cannot be deleted once created — they are part of the public track record.';
  return OLD;
end;
$$;

-- Reseed helper: clears demo analyst content (@stoa.demo accounts only).
create or replace function purge_demo_author(p_author_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from auth.users u
    where u.id = p_author_id
      and u.email like '%@stoa.demo'
  ) then
    raise exception 'purge_demo_author only allowed for @stoa.demo accounts';
  end if;

  perform set_config('app.allow_prediction_delete', 'true', true);
  delete from predictions where author_id = p_author_id;
  delete from reports where author_id = p_author_id;
end;
$$;

revoke all on function purge_demo_author(uuid) from public;
grant execute on function purge_demo_author(uuid) to service_role;
