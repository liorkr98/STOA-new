-- Cached audio briefs per report + voice persona. Generate once, replay for all readers.

create table if not exists report_audio_briefs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  voice_id text not null,
  mode text not null default 'brief' check (mode in ('brief', 'extended', 'full')),
  storage_path text not null,
  script_text text not null,
  script_chars integer not null,
  content_hash text,
  credits_charged integer not null default 0,
  generated_by uuid references profiles (id) on delete set null,
  duration_estimate_sec integer,
  created_at timestamptz not null default now(),
  unique (report_id, voice_id)
);

create index if not exists report_audio_briefs_report_id_idx on report_audio_briefs (report_id);

comment on table report_audio_briefs is
  'One cached audio brief per report per voice persona. Subsequent playback serves storage without re-generation.';

alter table report_audio_briefs enable row level security;

-- No direct client access — server uses service role for reads/writes.
