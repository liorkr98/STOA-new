-- H4: audio briefs. PRIVATE bucket -- playback goes through the gated route
-- (canReadReport) which mints a short-lived signed URL, so a paid brief is
-- never a public file. Files are written by the server (service role) only.

insert into storage.buckets (id, name, public)
values ('report-audio', 'report-audio', false)
on conflict (id) do nothing;
