-- Rating storage, subscription expiry, schema hardening, paywall fix.
-- Run after 0001-0004 on existing projects.

-- ── Canonical 600-1400 display rating (score 0-100 stays for tiers) ───────────
alter table profiles add column if not exists rating int not null default 600;

-- Backfill from existing 0-100 scores.
update profiles
set rating = 600 + round((score::numeric / 100) * 800)
where rating = 600 and score > 0;

create index if not exists profiles_rating_idx on profiles (rating desc);

-- ── Benchmark audit trail at resolution ───────────────────────────────────────
alter table predictions add column if not exists bench_resolved_price numeric(14, 4);

-- One investment card per report.
create unique index if not exists predictions_report_unique on predictions (report_id);

create index if not exists report_views_report_idx on report_views (report_id);

-- ── Subscription expiry (30-day renews_at) ────────────────────────────────────
create or replace function expire_subscriptions()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update subscriptions
  set status = 'expired'
  where status = 'active' and renews_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── Paywall: subscribers no longer bypass paid-report unlock ──────────────────
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
                  where s.analyst_id = r.author_id
                    and s.subscriber_id = auth.uid()
                    and s.status = 'active'
                    and s.renews_at > now()
                )
              )
            )
          )
        )
    )
  );
