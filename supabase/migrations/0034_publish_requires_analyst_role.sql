-- reports_update never had an explicit `with check`, so Postgres reused its
-- `using` clause (author_id = auth.uid()) for the new row too -- meaning any
-- authenticated owner of a row could flip status to 'published' directly,
-- regardless of whether an admin ever approved them as an analyst
-- (approve_analyst_application, 0031). The app layer's own gate
-- (validateAndPublishReport, src/lib/reports/publish-report.ts) only covers
-- the one call path that goes through it; a direct Supabase write bypassed
-- it entirely. RLS is the hard backstop here, same reasoning as
-- canReadReport's own comment: the app check is the readable front door, RLS
-- is the lock. Drafts are unaffected -- only a transition to 'published' (or
-- 'resolution_pending_review', which the grading cron itself sets via the
-- admin client and is therefore exempt) requires an approved role.

drop policy if exists reports_update on reports;
create policy reports_update on reports
  for update using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (
      status not in ('published', 'resolution_pending_review')
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('analyst', 'admin')
      )
    )
  );

drop policy if exists reports_insert on reports;
create policy reports_insert on reports
  for insert with check (
    author_id = auth.uid()
    and (
      status not in ('published', 'resolution_pending_review')
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('analyst', 'admin')
      )
    )
  );
