-- Editing a published report, in the open.
--
-- Published reports could not be edited at all: the guard from 0012/0041 froze
-- the title and summary, and 0012 froze the body outright. That is the right
-- default for a platform whose claim is that the record cannot be quietly
-- rewritten, but it also meant an analyst who noticed their own error could do
-- nothing about it except archive the piece.
--
-- So editing is allowed and every edit is disclosed. The disclosure is the
-- point: `report_edits` is written on every change and is publicly readable,
-- so a reader can always see that a publication was revised and when.
--
-- WHAT THIS PERMITS, once a report is locked
--   reports.title      the headline
--   reports.summary    the dek
--   reports.content_hash
--   report_bodies.body the thesis
--   (tags and publication_cards were already author-writable after publish;
--    this migration does not change them, it only records that they changed.)
--
-- WHAT THIS STILL FORBIDS, exactly as before
--   reports.ticker, reports.type, reports.access, reports.price,
--   reports.locked_at, and un-publishing back to draft.
--   The call itself: ticker, direction, lock/entry price, target, horizon and
--   resolves_at are frozen by prevent_prediction_terms_edit (0012), which this
--   migration does not touch. Neither is the resolution: it is written once on
--   the prediction, open -> a terminal outcome, and never again.
--   Deleting a publication that carries a call (0062) is likewise untouched.
--
-- content_hash is deliberately allowed to move. It attests to the content that
-- is actually published; freezing it across an edit would leave it attesting to
-- text that no longer exists, which is worse than letting it follow the edit
-- that report_edits already records.

-- ============================================================
-- The edit log
-- ============================================================
create table if not exists report_edits (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  edited_at timestamptz not null default now(),
  -- Which parts changed: 'headline', 'dek', 'thesis', 'cards', 'tags'.
  sections text[] not null,
  -- Headline and dek are already public everywhere the publication appears, so
  -- the before/after is recorded and shown. The thesis is not: it sits behind
  -- report_bodies and its paywall, so only the fact and the time of the change
  -- are public. The previous text stays in report_versions, author-only.
  title_before text,
  title_after text,
  dek_before text,
  dek_after text
);

create index if not exists report_edits_report_idx
  on report_edits (report_id, edited_at desc);

comment on table report_edits is
  'One row per edit of a published report. Publicly readable so the EDITED marker can say what changed and when. Never records paywalled prose: the thesis is logged as changed, not quoted.';

alter table report_edits enable row level security;

-- Public: readable exactly where the publication itself is visible.
drop policy if exists report_edits_read on report_edits;
create policy report_edits_read on report_edits
  for select using (
    exists (
      select 1 from reports r
      where r.id = report_edits.report_id
        and (
          r.status in ('published', 'archived', 'resolution_pending_review')
          or r.author_id = auth.uid()
        )
    )
  );

-- Written by the author of the report, and nobody else.
drop policy if exists report_edits_insert on report_edits;
create policy report_edits_insert on report_edits
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from reports r
      where r.id = report_edits.report_id and r.author_id = auth.uid()
    )
  );

-- Deliberately no update and no delete policy. An edit record cannot be
-- rewritten or removed by anyone, which is what makes the marker worth trusting.

-- ============================================================
-- reports: let the prose move, keep everything else frozen
-- ============================================================
create or replace function prevent_locked_report_edit()
returns trigger language plpgsql as $$
begin
  if OLD.locked_at is not null then
    if NEW.ticker is distinct from OLD.ticker
       or NEW.type is distinct from OLD.type
       or NEW.access is distinct from OLD.access
       or NEW.price is distinct from OLD.price
       or NEW.locked_at is distinct from OLD.locked_at
       or (NEW.status = 'draft' and OLD.status <> 'draft') then
      raise exception
        'Cannot modify a locked report''s ticker, type, pricing, access or lock timestamp, and it cannot return to draft. The headline, dek and thesis may be edited; every edit is recorded in report_edits.';
    end if;
  end if;
  return NEW;
end;
$$;

-- ============================================================
-- report_bodies: an edit is allowed, the 0062 delete cascade still is too
-- ============================================================
create or replace function prevent_locked_body_edit()
returns trigger language plpgsql as $$
declare
  v_locked timestamptz;
begin
  -- An update is an edit, and edits are allowed now. report_edits carries the
  -- disclosure and report_versions keeps the previous text.
  if TG_OP = 'UPDATE' then
    return NEW;
  end if;

  -- The rest is DELETE. The 0062 cascade, from deleting a callless
  -- publication, is the one permitted case.
  if current_setting('app.deleting_callless_report', true) = OLD.report_id::text then
    return OLD;
  end if;

  select locked_at into v_locked from reports where id = OLD.report_id;
  if v_locked is not null then
    raise exception 'The body of a locked report cannot be deleted.';
  end if;

  return OLD;
end;
$$;

comment on function prevent_locked_report_edit() is
  'Freezes ticker, type, access, price and locked_at after publish, and blocks a return to draft. Headline, dek and thesis are editable; the call and its resolution are frozen separately by prevent_prediction_terms_edit.';
