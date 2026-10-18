-- 0069: clip media links are handed out by the server only.
--
-- video_clips_public_read lets anyone, signed in or not, select every column of
-- every published clip, including the Bunny guid and the playback, poster,
-- preview and caption URLs. With the anon key from any page, a script could
-- list all of them and fetch the media directly, with no session.
--
-- The site no longer reads these columns through a reader's client: it reads
-- them with the service key and signs them before they leave the server
-- (src/lib/db/video-clips.ts `withMedia`, src/lib/media/sign.ts). So anon and
-- authenticated lose SELECT on exactly these five columns. Row visibility
-- (the policy) is unchanged, and INSERT/UPDATE privileges are untouched.
--
-- Safe to apply before or after the code that reads around it ships: that
-- code never selects these columns through anon or authenticated.
--
-- Column privileges are additive, so the table-level SELECT is revoked and the
-- allowed columns granted back. A column added later is not readable by these
-- roles until it is granted here.

revoke select on table public.video_clips from anon, authenticated;

grant select (
  id,
  report_id,
  creator_id,
  transcript,
  duration_seconds,
  status,
  fact_check_results,
  created_at,
  published_at,
  play_count,
  completion_count,
  click_through_count
) on table public.video_clips to anon, authenticated;

-- Self-check: the five media columns are no longer readable by either role.
do $$
declare
  leaked int;
begin
  select count(*) into leaked
  from information_schema.column_privileges
  where table_schema = 'public'
    and table_name = 'video_clips'
    and grantee in ('anon', 'authenticated')
    and privilege_type = 'SELECT'
    and column_name in ('bunny_video_guid', 'playback_url', 'thumbnail_url', 'preview_url', 'caption_vtt_url');
  if leaked > 0 then
    raise exception '0069: % media column grants remain on video_clips', leaked;
  end if;
end $$;
