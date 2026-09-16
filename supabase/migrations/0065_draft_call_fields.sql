-- A draft call's direction, target and horizon, kept between sessions.
--
-- Until now only the ticker survived a reopened draft (reports.ticker); the
-- direction, the target and the horizon lived in the browser tab and were
-- gone on reload. That was a nuisance on a video with a call and a real
-- problem for a verdict, whose whole content is the call. These three
-- columns hold the draft's values; the locked call still lives on
-- `predictions` and nothing here is graded or public.
--
-- Written by the author's own draft saves, under the existing reports
-- policies. Compose writes them in a separate statement and carries on if
-- the columns are missing, so applying this later loses nothing.

alter table reports
  add column if not exists draft_direction direction,
  add column if not exists draft_target_price numeric(14, 4),
  add column if not exists draft_horizon_days int;

alter table reports
  drop constraint if exists reports_draft_horizon_check;
alter table reports
  add constraint reports_draft_horizon_check
  check (draft_horizon_days is null or (draft_horizon_days >= 1 and draft_horizon_days <= 730));

comment on column reports.draft_direction is
  'Compose draft: the call''s direction before publish. The locked call is on predictions.';
comment on column reports.draft_target_price is
  'Compose draft: the call''s target before publish.';
comment on column reports.draft_horizon_days is
  'Compose draft: the call''s horizon in days before publish.';
