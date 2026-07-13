-- Video-led Discover & Dispatch (video_first_discover).
--
-- Two new tables plus a small feature-flag table. The hard rule from the
-- redesign brief is enforced at the schema level here: `video_clips.report_id`
-- is NOT NULL, so a video cannot exist without a locked/published report behind
-- it. This keeps video "the door," not "the room."
--
-- Bunny Stream is the hosting provider. Playback URLs are public CDN URLs (the
-- teaser is public by design); the paywalled depth stays behind the linked
-- report's RLS, unchanged.

-- ---------------------------------------------------------------------------
-- Feature flags (Part 1): reversible, measured rollout.
-- ---------------------------------------------------------------------------
create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

insert into feature_flags (key, enabled, description)
values ('video_first_discover', false, 'Video-led Discover feed and Dispatch lead story')
on conflict (key) do nothing;

alter table feature_flags enable row level security;

-- Anyone can read flags (needed to branch the UI); only admins can flip them.
create policy feature_flags_read on feature_flags for select using (true);
create policy feature_flags_admin_write on feature_flags
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- video_clips (Part 2.2): one clip -> exactly one report (report_id NOT NULL).
-- ---------------------------------------------------------------------------
create table if not exists video_clips (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  creator_id uuid not null references profiles (id) on delete cascade,
  bunny_video_guid text not null,
  playback_url text not null,
  thumbnail_url text,
  preview_url text,
  caption_vtt_url text,
  transcript text,
  duration_seconds int not null default 0,
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'failed')),
  fact_check_results jsonb,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists video_clips_report_idx on video_clips (report_id);
create index if not exists video_clips_creator_idx on video_clips (creator_id);
create index if not exists video_clips_guid_idx on video_clips (bunny_video_guid);
create index if not exists video_clips_feed_idx
  on video_clips (published_at desc)
  where status = 'ready' and published_at is not null;

alter table video_clips enable row level security;

-- Public read of published, ready clips (the teaser is public by design). The
-- creator can always see their own rows (including processing/failed drafts).
create policy video_clips_public_read on video_clips
  for select using (
    (status = 'ready' and published_at is not null)
    or creator_id = auth.uid()
  );

create policy video_clips_creator_insert on video_clips
  for insert with check (creator_id = auth.uid());

create policy video_clips_creator_update on video_clips
  for update using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy video_clips_creator_delete on video_clips
  for delete using (creator_id = auth.uid());

-- ---------------------------------------------------------------------------
-- video_view_events (Part 2.7): funnel metrics for the Part 1 decision gate.
-- ---------------------------------------------------------------------------
create table if not exists video_view_events (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references video_clips (id) on delete cascade,
  viewer_id uuid references profiles (id) on delete set null,
  watched_seconds int,
  completed boolean not null default false,
  clicked_through_to_report boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists video_view_events_video_idx on video_view_events (video_id, created_at desc);

alter table video_view_events enable row level security;

-- Anyone (including logged-out viewers) may log a view event, but only for
-- themselves (or anonymously). The clip creator and admins can read the funnel.
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
