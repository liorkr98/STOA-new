-- 0034_publish_requires_analyst_role gated every insert/update of
-- status IN ('published','resolution_pending_review') behind an approved
-- analyst/admin role. postNote() (src/app/actions/reports.ts) inserts
-- short_post rows with status='published' directly -- its own doc comment
-- says "Any signed-in user can post. Published immediately, no prediction,
-- fans out to followers", the social discovery layer. 0034 silently revoked
-- that for every non-analyst account. Exempt short_post from the role check;
-- research/call publishing still requires an approved analyst.

drop policy if exists reports_insert on reports;
create policy reports_insert on reports
  for insert with check (
    author_id = auth.uid()
    and (
      type = 'short_post'
      or status not in ('published', 'resolution_pending_review')
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('analyst', 'admin')
      )
    )
  );

drop policy if exists reports_update on reports;
create policy reports_update on reports
  for update using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (
      type = 'short_post'
      or status not in ('published', 'resolution_pending_review')
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('analyst', 'admin')
      )
    )
  );
