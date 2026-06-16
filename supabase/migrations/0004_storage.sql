-- Storage buckets for avatars and report cover images.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('covers', 'covers', true)
on conflict (id) do nothing;

-- Anyone can read public assets.
create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "public read covers" on storage.objects
  for select using (bucket_id = 'covers');

-- Authenticated users manage their own files (path prefixed with their uid).
create policy "own upload avatars" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own update avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own upload covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own update covers" on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
