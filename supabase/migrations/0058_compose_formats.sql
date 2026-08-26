-- Compose formats: video as its own type, a companion link, Feed preview
-- length for long clips, and paid-unlock that members may also open.

alter type content_type add value if not exists 'video';

alter table reports
  add column if not exists linked_report_id uuid references reports (id) on delete set null,
  add column if not exists feed_preview_seconds integer,
  add column if not exists members_included boolean not null default false;

alter table reports
  drop constraint if exists reports_linked_not_self;
alter table reports
  add constraint reports_linked_not_self
  check (linked_report_id is distinct from id);

alter table reports
  drop constraint if exists reports_feed_preview_check;
alter table reports
  add constraint reports_feed_preview_check
  check (
    feed_preview_seconds is null
    or (feed_preview_seconds >= 15 and feed_preview_seconds <= 120)
  );

create index if not exists reports_linked_idx
  on reports (linked_report_id)
  where linked_report_id is not null;

comment on column reports.linked_report_id is
  'Companion publication: a video points at research/post, or research/post points at a video.';
comment on column reports.feed_preview_seconds is
  'When set, the Feed plays only this many seconds; the rest is on the publication page. 45 for long videos.';
comment on column reports.members_included is
  'When access is paid, active subscribers may open the body without buying the unlock.';
