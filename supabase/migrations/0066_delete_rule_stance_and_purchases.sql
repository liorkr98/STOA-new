-- Who may delete a published publication, once grading is gone.
--
-- 0062 let a creator delete a publication only when no `predictions` row
-- pointed at it. With calls going away, that test would make every
-- publication deletable. Decided by Bar on 2026-09-24:
--
--   A publication that declares a stance (reports.stance, migration 0065) can
--   be archived, never deleted: a wrong view cannot be buried. Every call's
--   direction was copied onto its publication, so this refuses exactly what
--   0062 refused. While grading runs, a call is still refused as well.
--
--   A publication anyone has bought (a report_unlocks row) is never deleted,
--   whatever its stance. A reader losing what they paid for is worse than a
--   creator unable to tidy up. Before this, a paid publication with no call
--   could be deleted and the buyer's unlock cascaded away with it.
--
-- Drafts keep the behaviour they already had. The 0062 cascade flag and the
-- child-table guards are unchanged. Requires 0065.

create or replace function prevent_locked_report_delete()
returns trigger language plpgsql as $$
begin
  -- A draft has never been on the public record.
  if OLD.locked_at is null and OLD.status = 'draft' then
    return OLD;
  end if;

  if exists (select 1 from report_unlocks u where u.report_id = OLD.id) then
    raise exception
      'Someone has bought this publication, so it can be archived but not deleted.';
  end if;

  if OLD.stance is not null
     or exists (select 1 from predictions p where p.report_id = OLD.id) then
    raise exception
      'This publication declares a stance, so it can be archived but not deleted.';
  end if;

  -- Deletable content. The child guards read this flag so the cascade is not
  -- mistaken for an edit of locked content. Transaction-local.
  perform set_config('app.deleting_callless_report', OLD.id::text, true);
  return OLD;
end;
$$;

comment on function prevent_locked_report_delete() is
  'Refuses deletion of a published report that declares a stance, carries a call, or has been bought. Other published or archived reports may be deleted by their author; drafts are unchanged.';
