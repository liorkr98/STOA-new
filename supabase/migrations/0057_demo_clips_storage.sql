-- Public bucket for investor-demo stand-in clips. Real creator uploads still
-- go to Bunny; these files exist so Explore and the Feed have a picture and a
-- playable mp4 when the Bunny objects are empty.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'demo-clips',
  'demo-clips',
  true,
  52428800,
  array['video/mp4', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 52428800;

drop policy if exists "public read demo clips" on storage.objects;
create policy "public read demo clips"
  on storage.objects
  for select
  using (bucket_id = 'demo-clips');
