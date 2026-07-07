-- Perk-based report gating: reports can require specific perks from the analyst's
-- subscription tiers (stored as slug strings matching normalized plan.perks labels).

alter table reports
  add column if not exists required_perks text[] not null default '{}';

create or replace function public.perk_slug(label text)
returns text
language sql
immutable
as $$
  select lower(trim(both '-' from regexp_replace(coalesce(label, ''), '[^a-zA-Z0-9]+', '-', 'g')));
$$;

create or replace function public.plan_has_required_perks(plan_perks jsonb, required text[])
returns boolean
language sql
immutable
as $$
  select
    cardinality(required) = 0
    or (
      select count(*) = cardinality(required)
      from unnest(required) req
      where exists (
        select 1
        from jsonb_array_elements_text(coalesce(plan_perks, '[]'::jsonb)) elem
        where public.perk_slug(elem) = req
      )
    );
$$;

-- Extend subscriber paywall: rank AND optional perk requirements.
drop policy if exists bodies_read on report_bodies;
create policy bodies_read on report_bodies
  for select using (
    exists (
      select 1 from reports r
      where r.id = report_bodies.report_id
        and (
          r.author_id = auth.uid()
          or (
            r.status = 'published'
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
