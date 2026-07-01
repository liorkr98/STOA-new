-- Persist the MOAT score breakdown on the profile so:
--   1. The analytics page can show hit rate / avg return / alpha without
--      recomputing from raw predictions on every page load.
--   2. The grading job can build a platform-wide alpha distribution cheaply
--      (one query over `profiles` instead of every analyst's full history)
--      to percentile-rank alpha instead of a fixed linear band.
--
-- Mirrors the "store hit_rate, avg_return, sample_size alongside score" rule
-- from the MOAT formula spec — the score should never read as a black box.

alter table profiles
  add column if not exists wilson_win_rate numeric,
  add column if not exists profit_factor numeric,
  add column if not exists avg_return numeric,
  add column if not exists avg_alpha numeric,
  add column if not exists sample_size int not null default 0;

comment on column profiles.wilson_win_rate is 'Wilson lower-bound win rate (0-1) from the last grading pass.';
comment on column profiles.profit_factor is 'Decay-weighted avg win / avg loss from the last grading pass.';
comment on column profiles.avg_return is 'Mean signed return % across resolved calls.';
comment on column profiles.avg_alpha is 'Mean excess return % vs SPY across resolved calls with a benchmark. Null until 5+ benchmarked calls exist.';
comment on column profiles.sample_size is 'Count of resolved calls the current score is based on.';

create index if not exists profiles_avg_alpha_idx on profiles (avg_alpha) where avg_alpha is not null;
