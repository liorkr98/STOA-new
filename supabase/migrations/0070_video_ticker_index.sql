-- DRAFT - DO NOT APPLY
-- ===================================================================
-- Krisi applies this after review. Nothing in the app reads or writes
-- video_ticker_index yet: the extension's detection runs on a temporary
-- cache (src/lib/db/video-ticker-index.ts, TemporaryVideoIndexCache) until
-- this table exists and a Supabase store replaces it. Spec:
-- docs/backend/interest-cart.md, "The YouTube extension".
-- ===================================================================
--
-- One row per ticker per YouTube video: which stocks a video discusses, when,
-- and the speaker's stance, as worked out once by the detection endpoint
-- (POST /api/extension/detect) and served to every later viewer of that
-- video. Only the derived result is stored. The transcript itself is never
-- stored, here or anywhere else.

create table if not exists video_ticker_index (
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  ticker text not null check (ticker ~ '^[A-Z0-9.=^-]{1,12}$'),
  -- 'card' pops up beside the video; 'line' only joins the "In this video" line.
  kind text not null check (kind in ('card', 'line')),
  -- Seconds into the video: the stretch of discussion the card belongs to.
  start_seconds integer not null check (start_seconds >= 0),
  end_seconds integer not null check (end_seconds >= start_seconds),
  -- The speaker's own view in that stretch; null when they took no side.
  stance text check (stance in ('bull', 'bear')),
  conditional boolean not null default false,
  etf boolean not null default false,
  -- Display only: the listed name and a few words on what the company is.
  name text not null check (length(name) <= 200),
  what text check (what is null or length(what) <= 80),
  -- The transcript language the result was read from, and the model.
  language text not null check (length(language) <= 12),
  model text not null check (length(model) <= 64),
  detected_at timestamptz not null default now(),
  primary key (video_id, ticker)
);

-- "Has this video been read, and is the result still fresh?" is one lookup by
-- video. The primary key serves it. Refreshing after 30 days is a read-side
-- rule: the endpoint treats rows older than that as missing and re-reads.
create index if not exists video_ticker_index_detected_at on video_ticker_index (detected_at);

-- A video with no ticker worth a card still has to be remembered as read,
-- or every viewer would pay for an AI read. One row per video read.
create table if not exists video_ticker_reads (
  video_id text primary key check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  language text not null check (length(language) <= 12),
  model text not null check (length(model) <= 64),
  detected_at timestamptz not null default now()
);

-- Written and read only by the server with the service key: the extension
-- reaches it through /api/extension/detect, never directly.
alter table video_ticker_index enable row level security;
alter table video_ticker_reads enable row level security;
revoke all on video_ticker_index from anon, authenticated;
revoke all on video_ticker_reads from anon, authenticated;

-- Replacing a video's result is delete-then-insert inside one transaction,
-- keyed by video_id, so a re-read after 30 days never leaves old and new
-- tickers mixed:
--
--   begin;
--   delete from video_ticker_index where video_id = $1;
--   insert into video_ticker_index (...) values (...), (...);
--   insert into video_ticker_reads (video_id, language, model, detected_at)
--     values ($1, $2, $3, now())
--     on conflict (video_id) do update set language = excluded.language,
--       model = excluded.model, detected_at = excluded.detected_at;
--   commit;
--
-- Stale rows can be swept by a weekly job:
--   delete from video_ticker_index where detected_at < now() - interval '90 days';
--   delete from video_ticker_reads where detected_at < now() - interval '90 days';
