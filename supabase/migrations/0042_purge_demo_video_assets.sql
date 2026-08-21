-- purge_demo_author (0034) clears a demo analyst's predictions and reports so
-- `npm run seed` is safe to re-run, but video_assets was never included --
-- seeded video rows survived every purge and accumulated on each run. Video is
-- the lead medium (docs/VIDEO.md), so the seed now creates these rows and the
-- purge has to match. Deleted before reports: video_assets.report_id may be
-- restrictive, and the row is worthless once its report is gone either way.

create or replace function purge_demo_author(p_author_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from auth.users u
    where u.id = p_author_id
      and u.email like '%@stoa.demo'
  ) then
    raise exception 'purge_demo_author only allowed for @stoa.demo accounts';
  end if;

  perform set_config('app.allow_prediction_delete', 'true', true);
  delete from video_assets where creator_id = p_author_id;
  delete from predictions where author_id = p_author_id;
  delete from reports where author_id = p_author_id;
end;
$$;
