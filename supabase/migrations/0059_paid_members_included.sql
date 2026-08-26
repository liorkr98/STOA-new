-- Paid unlock may also be opened by an active subscriber when the analyst
-- ticks members_included. Keep report_bodies and the paywall helper in lockstep.

create or replace function can_read_report_body(p_report_id uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from reports r
    where r.id = p_report_id
      and (
        r.author_id = p_uid
        or (
          r.status in ('published', 'resolution_pending_review')
          and (
            r.access = 'free'
            or (
              r.access = 'paid'
              and (
                exists (
                  select 1 from report_unlocks u
                  where u.report_id = r.id and u.user_id = p_uid
                )
                or (
                  coalesce(r.members_included, false)
                  and exists (
                    select 1 from subscriptions s
                    where s.analyst_id = r.author_id
                      and s.subscriber_id = p_uid
                      and s.status = 'active'
                      and s.renews_at > now()
                  )
                )
              )
            )
            or (
              r.access = 'subscribers'
              and exists (
                select 1 from subscriptions s
                left join plans p on p.id = s.plan_id
                where s.analyst_id = r.author_id
                  and s.subscriber_id = p_uid
                  and s.status = 'active'
                  and s.renews_at > now()
                  and coalesce(p.rank, 0) >= r.min_plan_rank
                  and public.plan_has_required_perks(p.perks, r.required_perks)
              )
            )
          )
        )
      )
  );
$$;

drop policy if exists bodies_read on report_bodies;
create policy bodies_read on report_bodies
  for select using (public.can_read_report_body(report_id, auth.uid()));
