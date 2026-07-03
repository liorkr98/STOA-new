-- Chart screenshot storage for Tiptap chartNode blocks in published reports.
--
-- Path convention (frontend + publish validation must stay aligned):
--   chart-snapshots/{user_id}/{report_id}/{node_id}.png

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chart-snapshots',
  'chart-snapshots',
  true,
  5242880, -- 5MB
  array['image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read published chart PNGs (investors load without auth).
create policy "chart snapshots are publicly readable"
on storage.objects for select
using (bucket_id = 'chart-snapshots');

-- Authenticated analysts upload only under their own user_id prefix.
create policy "analysts can upload their own chart snapshots"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chart-snapshots'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "analysts can update their own chart snapshots"
on storage.objects for update to authenticated
using (
  bucket_id = 'chart-snapshots'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'chart-snapshots'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "analysts can delete their own chart snapshots"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chart-snapshots'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Extract screenshotUrl values from Tiptap JSON (report_bodies.body parsed as jsonb).
create or replace function extract_chart_screenshot_urls(body jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array(
      select distinct (val #>> '{}')
      from jsonb_path_query(body, '$.**.attrs.screenshotUrl') as t(val)
      where val #>> '{}' is not null and val #>> '{}' <> ''
    ),
    array[]::text[]
  );
$$;

grant execute on function extract_chart_screenshot_urls(jsonb) to authenticated, service_role;
