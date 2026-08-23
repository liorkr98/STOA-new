-- Feed / Explore ranking: denormalized clip funnel counters, extra view-event
-- fields, and an impressions log so position bias can be measured later.
--
-- Completion and click-through cannot be computed from video_view_events on
-- the request path (RLS is owner/admin-only). Counters live on video_clips,
-- which is already public-read for published clips.

alter table public.video_clips
  add column if not exists play_count int not null default 0,
  add column if not exists completion_count int not null default 0,
  add column if not exists click_through_count int not null default 0;

alter table public.video_view_events
  add column if not exists session_id uuid,
  add column if not exists video_length_seconds int,
  add column if not exists replayed boolean not null default false,
  add column if not exists skipped_at_seconds int,
  add column if not exists surface text,
  add column if not exists position_in_feed int;

create or replace function public.apply_video_view_clip_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.video_clips
  set
    play_count = play_count + case
      when not new.completed and not new.clicked_through_to_report then 1
      else 0
    end,
    completion_count = completion_count + case when new.completed then 1 else 0 end,
    click_through_count = click_through_count + case
      when new.clicked_through_to_report then 1
      else 0
    end
  where id = new.video_id;
  return new;
end;
$$;

revoke all on function public.apply_video_view_clip_stats() from public;

drop trigger if exists video_view_events_clip_stats on public.video_view_events;
create trigger video_view_events_clip_stats
  after insert on public.video_view_events
  for each row
  execute function public.apply_video_view_clip_stats();

update public.video_clips v
set
  play_count = coalesce(s.plays, 0),
  completion_count = coalesce(s.completions, 0),
  click_through_count = coalesce(s.clicks, 0)
from (
  select
    video_id,
    count(*) filter (where not completed and not clicked_through_to_report) as plays,
    count(*) filter (where completed) as completions,
    count(*) filter (where clicked_through_to_report) as clicks
  from public.video_view_events
  group by video_id
) s
where v.id = s.video_id;

create table if not exists public.ranking_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  session_id uuid not null,
  surface text not null check (surface in ('feed', 'explore')),
  video_id uuid not null references public.video_clips (id) on delete cascade,
  report_id uuid not null references public.reports (id) on delete cascade,
  analyst_id uuid not null references public.profiles (id) on delete cascade,
  position_in_feed int not null,
  was_exploration_slot boolean not null default false,
  score numeric,
  reasons text[],
  created_at timestamptz not null default now()
);

create index if not exists ranking_impressions_surface_idx
  on public.ranking_impressions (surface, created_at desc);
create index if not exists ranking_impressions_video_idx
  on public.ranking_impressions (video_id, created_at desc);
create index if not exists ranking_impressions_session_idx
  on public.ranking_impressions (session_id);

alter table public.ranking_impressions enable row level security;

drop policy if exists ranking_impressions_insert on public.ranking_impressions;
create policy ranking_impressions_insert on public.ranking_impressions
  for insert
  to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

drop policy if exists ranking_impressions_select on public.ranking_impressions;
create policy ranking_impressions_select on public.ranking_impressions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

grant insert, select on public.ranking_impressions to anon, authenticated;
