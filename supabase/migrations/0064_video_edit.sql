-- Video overlays, stored with the publication (backend brief item 10, route c).
--
-- The Compose editor lets a creator trim a clip and place text and visual
-- overlays on it. Until now that edit lived only in the browser tab: nothing
-- stored it, so a published clip played bare and a reopened draft had lost
-- its overlays. No burn-in worker exists and none is planned for now, so the
-- pragmatic route is taken: the edit is stored as JSON and Stoa's own player
-- draws the overlays over the video at playback. Inside Stoa a viewer cannot
-- tell the difference; a clip shared or downloaded elsewhere plays without
-- them, and the Compose copy says so.
--
-- Shape (src/lib/compose/overlays.ts, StoredVideoEdit):
--   { version: 1, durationSeconds, trimStart, trimEnd, overlays: Overlay[],
--     cards: DraftCard[] }
-- `cards` is a snapshot of the deck cards the overlays point at, taken when
-- the edit is saved, so the player can draw a card overlay without a second
-- read and without depending on the reader's access to the card itself: an
-- overlay is part of the video, which is the free teaser, exactly as a
-- burned-in card would have been.
--
-- Written by the author while the report is a draft (the publish path writes
-- it before the lock), read by anyone who can read the report. No new policy:
-- the column rides on the existing reports policies.

alter table reports
  add column if not exists video_edit jsonb;

comment on column reports.video_edit is
  'Compose video edit: trim and timed overlays, drawn by the player at playback. See src/lib/compose/overlays.ts.';
