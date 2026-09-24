-- A publication's stance: its ticker and a direction, on the publication.
--
-- Replaces the unapplied 0065_draft_call_fields (draft direction, target and
-- horizon). Grading is being removed, so a publication no longer carries a
-- call to be graded. It keeps a stance: one ticker (reports.ticker, which it
-- already has) and one direction, long, short or hold, declared with its tags.
-- Drafts hold it too, so a reopened draft keeps its direction.
--
-- This migration only adds and copies. predictions, grading and every
-- resolution are untouched and keep running.
--
-- THE COPY
--   Every call's direction is copied onto its publication. The ticker needs no
--   copy: on 2026-09-24 all 1,128 calls already carried their publication's
--   ticker, character for character. The check at the end refuses the whole
--   migration if that stopped being true, or if any call's direction did not
--   land, so it either moves everything or nothing.
--
-- AFTER PUBLISH
--   The stance is frozen with the ticker once a publication is locked, the
--   same rule the ticker has always had. The copy runs before that rule is
--   extended, which is why the order below matters.

alter table reports
  add column if not exists stance direction;

comment on column reports.stance is
  'The publication''s direction on reports.ticker: long, short or hold. Null when it declares no direction. Frozen with the ticker once locked.';

alter table reports
  drop constraint if exists reports_stance_needs_ticker;
alter table reports
  add constraint reports_stance_needs_ticker
  check (stance is null or ticker is not null);

-- ============================================================
-- The copy
-- ============================================================
-- updated_at orders every creator's Studio list. The copy is not an edit, so
-- it must not move 1,128 publications to the top.
alter table reports disable trigger reports_updated_at;

update reports r
set stance = p.direction
from predictions p
where p.report_id = r.id
  and r.stance is distinct from p.direction;

alter table reports enable trigger reports_updated_at;

do $$
declare
  v_calls int;
  v_matched int;
  v_ticker_mismatch int;
  v_direction_mismatch int;
begin
  select count(*) into v_calls from predictions;

  select count(*) into v_ticker_mismatch
  from predictions p join reports r on r.id = p.report_id
  where r.ticker is distinct from p.ticker;

  select count(*) into v_direction_mismatch
  from predictions p join reports r on r.id = p.report_id
  where r.stance is distinct from p.direction;

  select count(*) into v_matched
  from predictions p join reports r on r.id = p.report_id
  where r.ticker = p.ticker and r.stance = p.direction;

  if v_ticker_mismatch > 0 or v_direction_mismatch > 0 or v_matched <> v_calls then
    raise exception
      'Stance copy incomplete: % calls, % matched, % ticker mismatches, % direction mismatches. Nothing was changed.',
      v_calls, v_matched, v_ticker_mismatch, v_direction_mismatch;
  end if;

  raise notice 'Stance copied: % of % calls now carried by their publication.', v_matched, v_calls;
end;
$$;

-- ============================================================
-- reports: freeze the stance with the ticker once locked
-- ============================================================
create or replace function prevent_locked_report_edit()
returns trigger language plpgsql as $$
begin
  if OLD.locked_at is not null then
    if NEW.ticker is distinct from OLD.ticker
       or NEW.stance is distinct from OLD.stance
       or NEW.type is distinct from OLD.type
       or NEW.access is distinct from OLD.access
       or NEW.price is distinct from OLD.price
       or NEW.locked_at is distinct from OLD.locked_at
       or (NEW.status = 'draft' and OLD.status <> 'draft') then
      raise exception
        'Cannot modify a locked report''s ticker, stance, type, pricing, access or lock timestamp, and it cannot return to draft. The headline, dek and thesis may be edited; every edit is recorded in report_edits.';
    end if;
  end if;
  return NEW;
end;
$$;

-- Markets counts publications by stance on a ticker.
create index if not exists reports_ticker_stance_idx
  on reports (ticker, stance)
  where stance is not null and status in ('published', 'resolution_pending_review');
