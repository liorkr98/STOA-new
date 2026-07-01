-- Trust & compliance layer.
--
-- Core principle: anything that becomes part of a creator's public track record
-- is append-only. Enforced here with triggers, not just app-level checks — a
-- locked report/call is only as trustworthy as the guarantee that nobody,
-- including the platform operator, can quietly edit it after the fact.

-- ============================================================
-- Disclosure block (mandatory, Reg-AC-style "these are my own views" cert)
-- ============================================================
alter table reports
  add column if not exists locked_at timestamptz,
  add column if not exists position_disclosed boolean not null default false,
  add column if not exists position_held boolean,
  add column if not exists compensation_disclosed boolean not null default false,
  add column if not exists compensation_tied boolean,
  add column if not exists compensation_detail text,
  add column if not exists views_certified boolean not null default false;

comment on column reports.locked_at is 'Set once at publish. Freezes title/summary/ticker/access/price via trigger below.';
comment on column reports.position_disclosed is 'Author explicitly answered the "do you hold a position" question.';
comment on column reports.position_held is 'True if the author holds a position in the ticker discussed.';
comment on column reports.compensation_disclosed is 'Author explicitly answered the "were you compensated" question.';
comment on column reports.compensation_tied is 'True if compensation is tied to this specific piece of content.';
comment on column reports.views_certified is 'Author certified "these are my own views" prior to publish (Reg-AC style).';

create index if not exists reports_locked_idx on reports (locked_at) where locked_at is not null;

-- Backfill locked_at for anything already published, so the immutability
-- trigger below applies retroactively to existing published content.
update reports set locked_at = published_at where status = 'published' and locked_at is null;

-- ============================================================
-- Immutability enforcement — reports
-- ============================================================
create or replace function prevent_locked_report_edit()
returns trigger language plpgsql as $$
begin
  if OLD.locked_at is not null then
    if NEW.title is distinct from OLD.title
       or NEW.summary is distinct from OLD.summary
       or NEW.ticker is distinct from OLD.ticker
       or NEW.type is distinct from OLD.type
       or NEW.access is distinct from OLD.access
       or NEW.price is distinct from OLD.price
       or NEW.locked_at is distinct from OLD.locked_at
       or (NEW.status = 'draft' and OLD.status <> 'draft') then
      raise exception 'Cannot modify a locked report''s content, pricing, ticker, or lock timestamp. Only status (archive), engagement counters, and fact_check_results are mutable after lock.';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists enforce_report_immutability on reports;
create trigger enforce_report_immutability
before update on reports
for each row execute function prevent_locked_report_edit();

-- Set locked_at automatically the moment a report transitions to 'published'.
create or replace function set_report_locked_at()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'published' and OLD.status is distinct from 'published' and NEW.locked_at is null then
    NEW.locked_at := coalesce(NEW.published_at, now());
  end if;
  return NEW;
end;
$$;

drop trigger if exists set_locked_at_on_publish on reports;
create trigger set_locked_at_on_publish
before update on reports
for each row execute function set_report_locked_at();

-- Block hard deletes of anything ever locked — only drafts can be deleted.
create or replace function prevent_locked_report_delete()
returns trigger language plpgsql as $$
begin
  if OLD.locked_at is not null then
    raise exception 'Locked reports cannot be deleted, only archived.';
  end if;
  return OLD;
end;
$$;

drop trigger if exists enforce_report_no_delete on reports;
create trigger enforce_report_no_delete
before delete on reports
for each row execute function prevent_locked_report_delete();

-- ============================================================
-- Immutability enforcement — report bodies (freeze once parent is locked)
-- ============================================================
create or replace function prevent_locked_body_edit()
returns trigger language plpgsql as $$
declare v_locked timestamptz;
begin
  select locked_at into v_locked from reports where id = coalesce(NEW.report_id, OLD.report_id);
  if v_locked is not null then
    raise exception 'Cannot modify the body of a locked report.';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists enforce_body_immutability on report_bodies;
create trigger enforce_body_immutability
before update or delete on report_bodies
for each row execute function prevent_locked_body_edit();

-- ============================================================
-- Immutability enforcement — predictions (the price-target lock)
-- ============================================================
-- The call's terms (ticker, direction, lock/target price, horizon, resolves_at,
-- benchmark lock price) are frozen the instant the row exists. Only the
-- resolution fields may be written, and only once (open -> a terminal outcome).
create or replace function prevent_prediction_terms_edit()
returns trigger language plpgsql as $$
begin
  if NEW.ticker is distinct from OLD.ticker
     or NEW.direction is distinct from OLD.direction
     or NEW.lock_price is distinct from OLD.lock_price
     or NEW.target_price is distinct from OLD.target_price
     or NEW.horizon_days is distinct from OLD.horizon_days
     or NEW.resolves_at is distinct from OLD.resolves_at
     or NEW.bench_lock_price is distinct from OLD.bench_lock_price
     or NEW.report_id is distinct from OLD.report_id
     or NEW.author_id is distinct from OLD.author_id then
    raise exception 'Cannot modify a locked call''s ticker, direction, price target, horizon, or benchmark lock.';
  end if;
  if OLD.outcome <> 'open' and NEW.outcome is distinct from OLD.outcome then
    raise exception 'Cannot re-resolve a call that has already been graded.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists enforce_prediction_immutability on predictions;
create trigger enforce_prediction_immutability
before update on predictions
for each row execute function prevent_prediction_terms_edit();

create or replace function prevent_prediction_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'Calls cannot be deleted once created — they are part of the public track record.';
  return OLD;
end;
$$;

drop trigger if exists enforce_prediction_no_delete on predictions;
create trigger enforce_prediction_no_delete
before delete on predictions
for each row execute function prevent_prediction_delete();

-- ============================================================
-- Audit log — append-only trail for anything compliance-sensitive
-- ============================================================
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  action text not null, -- 'report.locked' | 'report.resolved' | 'report.archived' | 'payout.sent' | 'identity.verified' | 'connect.activated' ...
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on audit_log (entity_type, entity_id);
create index if not exists audit_log_actor_idx on audit_log (actor_id, created_at desc);

alter table audit_log enable row level security;

-- Only admins can browse the audit trail; nobody can update/delete it (append-only).
create policy audit_log_admin_read on audit_log
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Helper used by triggers and SECURITY DEFINER functions to append a row.
-- Postgres grants EXECUTE to PUBLIC on new functions by default — explicitly
-- revoke it so this is only reachable from other SECURITY DEFINER functions
-- and BEFORE/AFTER triggers (which run as the definer, bypassing the revoke),
-- never directly by a client via `supabase.rpc()`. This keeps the log
-- genuinely tamper-resistant rather than just conventionally private.
create or replace function log_audit(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke execute on function log_audit(uuid, text, text, uuid, jsonb) from public;

-- Auto-log report lock + archive transitions.
create or replace function audit_report_transitions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'published' and OLD.status is distinct from 'published' then
    perform log_audit(NEW.author_id, 'report.locked', 'report', NEW.id,
      jsonb_build_object('ticker', NEW.ticker, 'type', NEW.type));
  elsif NEW.status = 'archived' and OLD.status is distinct from 'archived' then
    perform log_audit(NEW.author_id, 'report.archived', 'report', NEW.id, '{}'::jsonb);
  end if;
  return NEW;
end;
$$;

drop trigger if exists audit_report_transitions_trg on reports;
create trigger audit_report_transitions_trg
after update on reports
for each row execute function audit_report_transitions();

-- Auto-log call resolution (grading engine flips outcome away from 'open').
create or replace function audit_prediction_resolution()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.outcome <> 'open' and OLD.outcome = 'open' then
    perform log_audit(NEW.author_id, 'report.resolved', 'prediction', NEW.id,
      jsonb_build_object(
        'ticker', NEW.ticker,
        'outcome', NEW.outcome,
        'return_pct', NEW.return_pct,
        'resolved_price', NEW.resolved_price
      ));
  end if;
  return NEW;
end;
$$;

drop trigger if exists audit_prediction_resolution_trg on predictions;
create trigger audit_prediction_resolution_trg
after update on predictions
for each row execute function audit_prediction_resolution();

-- Auto-log payouts (creator earnings from a sale or subscription).
create or replace function audit_payout()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.type = 'payout' then
    perform log_audit(NEW.owner_id, 'payout.sent', 'wallet_transaction', NEW.id,
      jsonb_build_object('amount', NEW.amount, 'related_id', NEW.related_id, 'memo', NEW.memo));
  end if;
  return NEW;
end;
$$;

drop trigger if exists audit_payout_trg on wallet_transactions;
create trigger audit_payout_trg
after insert on wallet_transactions
for each row execute function audit_payout();
