-- Scale-Hardening Section 5: partition video_view_events by month.
--
-- This is the table the video feed hammers (one row per view). Range
-- partitioning by created_at keeps the hot (current-month) partition small and
-- lets old months be archived/dropped cheaply. Safe to run here because the
-- table is currently empty; the same pattern for audit_log is deferred to a
-- staging-first migration because of its append-only triggers (docs/SCALE.md).
--
-- Partitioned tables require the partition key in every unique/primary key, so
-- the PK becomes (id, created_at).

alter table video_view_events rename to video_view_events_legacy;

create table video_view_events (
  id uuid not null default gen_random_uuid(),
  video_id uuid not null references video_clips (id) on delete cascade,
  viewer_id uuid references profiles (id) on delete set null,
  watched_seconds int,
  completed boolean not null default false,
  clicked_through_to_report boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

create index if not exists video_view_events_video_idx
  on video_view_events (video_id, created_at desc);

alter table video_view_events enable row level security;

create policy video_view_events_insert on video_view_events
  for insert with check (viewer_id is null or viewer_id = auth.uid());

create policy video_view_events_owner_read on video_view_events
  for select using (
    exists (
      select 1 from video_clips v
      where v.id = video_view_events.video_id and v.creator_id = auth.uid()
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Create a partition for a given month start (idempotent).
create or replace function create_video_view_partition(p_month date)
returns void language plpgsql as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name text := 'video_view_events_' || to_char(v_start, 'YYYYMM');
begin
  execute format(
    'create table if not exists %I partition of video_view_events for values from (%L) to (%L)',
    v_name, v_start, v_end
  );
end;
$$;

-- Ensures the current and next month partitions exist. Schedule monthly
-- (pg_cron or a Vercel cron hitting a job) so there is always a landing zone.
create or replace function ensure_video_view_partitions()
returns void language plpgsql as $$
begin
  perform create_video_view_partition(current_date);
  perform create_video_view_partition((current_date + interval '1 month')::date);
end;
$$;

-- Seed the initial partitions and a catch-all so inserts never fail.
select ensure_video_view_partitions();
create table if not exists video_view_events_default partition of video_view_events default;

-- Move any existing rows, then drop the legacy table.
insert into video_view_events (
  id, video_id, viewer_id, watched_seconds, completed, clicked_through_to_report, created_at
)
select id, video_id, viewer_id, watched_seconds, completed, clicked_through_to_report, created_at
from video_view_events_legacy;

drop table video_view_events_legacy;
