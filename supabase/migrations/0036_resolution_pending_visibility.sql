-- Fix: a report awaiting resolution review (grade.ts sets reports.status =
-- 'resolution_pending_review' when the market-data provider has no price on
-- a call's horizon date) silently vanished from public view. reports_read,
-- predictions_read, and bodies_read all only ever treated status = 'published'
-- as publicly readable, so the moment ONE prediction's resolution needed a
-- pending-review flag, its entire report 404'd for every non-author visitor --
-- for content that never actually changed. Nothing about the report or its
-- body is in question here, only whether the call has resolved yet; a reader
-- who could see the report before this status flip should still see it,
-- unlock included, and see the call marked "pending review" instead of a
-- 404. Every other entitlement check (free/paid/subscriber, unlock, plan
-- rank, perks) is unchanged.

drop policy if exists reports_read on reports;
create policy reports_read on reports
  for select using (
    status in ('published', 'resolution_pending_review') or author_id = auth.uid()
  );

drop policy if exists predictions_read on predictions;
create policy predictions_read on predictions
  for select using (
    exists (
      select 1 from reports r
      where r.id = predictions.report_id
        and (
          r.status in ('published', 'resolution_pending_review')
          or r.author_id = auth.uid()
        )
    )
  );

drop policy if exists bodies_read on report_bodies;
create policy bodies_read on report_bodies
  for select using (
    exists (
      select 1 from reports r
      where r.id = report_bodies.report_id
        and (
          r.author_id = auth.uid()
          or (
            r.status in ('published', 'resolution_pending_review')
            and (
              r.access = 'free'
              or (
                r.access = 'paid'
                and exists (
                  select 1 from report_unlocks u
                  where u.report_id = r.id and u.user_id = auth.uid()
                )
              )
              or (
                r.access = 'subscribers'
                and exists (
                  select 1 from subscriptions s
                  left join plans p on p.id = s.plan_id
                  where s.analyst_id = r.author_id
                    and s.subscriber_id = auth.uid()
                    and s.status = 'active'
                    and s.renews_at > now()
                    and coalesce(p.rank, 0) >= r.min_plan_rank
                    and public.plan_has_required_perks(p.perks, r.required_perks)
                )
              )
            )
          )
        )
    )
  );
