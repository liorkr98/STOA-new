-- Deleting a publication that carries no call.
--
-- The permanence guarantee exists for one reason: to stop an analyst burying a
-- bad call. A publication with no call is not a track record, it is content,
-- and a creator should be able to remove their own content properly rather
-- than only hiding it behind an archive.
--
-- WHAT THIS PERMITS
--   A creator may hard-delete their own published or archived report when no
--   `predictions` row points at it. The row, its body, its cards, its tags and
--   its engagement counters go with it.
--
-- WHAT THIS STILL FORBIDS
--   Deleting anything that carries a call, at any status. The check is the
--   existence of a `predictions` row, not a status or a flag the application
--   could get wrong, so a call cannot be orphaned from its write-up.
--   Deleting a call on its own is still refused by prevent_prediction_delete
--   (0034), which this migration does not touch. Resolutions are likewise
--   untouched: they live on the prediction, which cannot be deleted.
--
-- Drafts keep the behaviour they already had, including the 0034 case of a
-- draft that has a prediction row and cascades.

-- ============================================================
-- reports
-- ============================================================
create or replace function prevent_locked_report_delete()
returns trigger language plpgsql as $$
begin
  -- A draft has never been on the public record.
  if OLD.locked_at is null and OLD.status = 'draft' then
    return OLD;
  end if;

  -- The call is the record. Its write-up cannot be deleted out from under it.
  if exists (select 1 from predictions p where p.report_id = OLD.id) then
    raise exception
      'A publication with a locked call cannot be deleted, only archived. The call stays on the public record.';
  end if;

  -- Callless content: the creator's to remove. The child guards below read
  -- this flag so the cascade is not mistaken for an edit of locked content.
  -- Transaction-local, so it cannot leak into any later statement.
  perform set_config('app.deleting_callless_report', OLD.id::text, true);
  return OLD;
end;
$$;

-- ============================================================
-- report_bodies: allow the cascade, still refuse a direct edit
-- ============================================================
create or replace function prevent_locked_body_edit()
returns trigger language plpgsql as $$
declare v_locked timestamptz;
begin
  if TG_OP = 'DELETE'
     and current_setting('app.deleting_callless_report', true) = OLD.report_id::text then
    return OLD;
  end if;

  select locked_at into v_locked from reports where id = coalesce(NEW.report_id, OLD.report_id);
  if v_locked is not null then
    raise exception 'Cannot modify the body of a locked report.';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

-- ============================================================
-- claims: same treatment, same reason
-- ============================================================
create or replace function prevent_claim_edit_if_report_locked()
returns trigger language plpgsql as $$
declare v_locked timestamptz;
begin
  if TG_OP = 'DELETE'
     and current_setting('app.deleting_callless_report', true) = OLD.report_id::text then
    return OLD;
  end if;

  select locked_at into v_locked from reports where id = coalesce(NEW.report_id, OLD.report_id);
  if v_locked is not null then
    raise exception 'Cannot modify fact-check claims on a locked report.';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

comment on function prevent_locked_report_delete() is
  'Refuses deletion of any report carrying a prediction. Callless published or archived reports may be deleted by their author; drafts are unchanged.';
