-- Backend brief item 4: engagement events, write path only.
--
-- History cannot be backfilled, so this starts collecting now even though the
-- lifecycle job (item 7) that reads it comes later. Insert-only from the app;
-- nothing on a request path ever reads it.
--
-- This is the highest-volume table in the product, so it is range-partitioned by
-- month from the start (same pattern as video_view_events) rather than converted
-- under load later. Partitioned tables need the partition key in the primary
-- key, hence (id, created_at).

create table if not exists engagement_events (
  id uuid not null default gen_random_uuid(),
  -- Null for logged-out readers: impressions and plays are worth counting anonymously.
  actor_id uuid references profiles (id) on delete set null,
  report_id uuid not null references reports (id) on delete cascade,
  kind text not null check (kind in (
    'impression',
    'play',
    'watch_progress',
    'swipe_depth',
    'cta_reach',
    'unlock',
    'subscribe',
    'follow_from_surface'
  )),
  -- Meaning depends on kind: seconds watched, swipe index, percent reached.
  value numeric,
  -- Where it happened: 'feed' | 'today' | 'explore' | 'profile' | 'report' | ...
  surface text,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

-- Read patterns are all "per report over a window" (the lifecycle job) or
-- "per kind over a window" (funnel counts).
create index if not exists engagement_events_report_idx
  on engagement_events (report_id, created_at desc);
create index if not exists engagement_events_kind_idx
  on engagement_events (kind, created_at desc);

alter table engagement_events enable row level security;

-- Anyone may record their own (or an anonymous) event. No SELECT policy at all:
-- reads are service-role only, which keeps the funnel private by construction.
drop policy if exists engagement_events_insert on engagement_events;
create policy engagement_events_insert on engagement_events
  for insert with check (actor_id is null or actor_id = auth.uid());

create or replace function create_engagement_partition(p_month date)
returns void language plpgsql as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name text := 'engagement_events_' || to_char(v_start, 'YYYYMM');
begin
  execute format(
    'create table if not exists %I partition of engagement_events for values from (%L) to (%L)',
    v_name, v_start, v_end
  );
end;
$$;

-- Call this monthly alongside ensure_video_view_partitions() from the
-- /api/cron/maintenance job. The default partition below means an insert never
-- fails even if the scheduled call is missed.
create or replace function ensure_engagement_partitions()
returns void language plpgsql as $$
begin
  perform create_engagement_partition(current_date);
  perform create_engagement_partition((current_date + interval '1 month')::date);
end;
$$;

select ensure_engagement_partitions();

-- Catch-all so an insert can never fail for want of a partition.
create table if not exists engagement_events_default partition of engagement_events default;

-- Retention: raw events age out; the lifecycle job's aggregates are what persist.
create or replace function cleanup_engagement_events(p_older_than interval default interval '180 days')
returns int language plpgsql security definer set search_path = public as $$
declare v_deleted int;
begin
  delete from engagement_events where created_at < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
