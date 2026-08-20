-- Backend brief item 5: instrument, ETF, sector and theme follows.
--
-- Analyst follows already live in `follows`. Ticker/sector follows were
-- browser-local (localStorage keys stoa-watchlist / stoa-sector-watchlist), so
-- nothing survived a device change and the server could never use them for
-- personalisation. This is the server-side home for all four kinds.

create table if not exists follows_instruments (
  owner_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('ticker', 'etf', 'sector', 'theme')),
  -- Ticker/ETF symbols are stored uppercase; sector and theme keep their label.
  symbol text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, kind, symbol)
);

-- Every read is "everything this owner follows", optionally narrowed by kind.
create index if not exists follows_instruments_owner_idx
  on follows_instruments (owner_id, kind);

alter table follows_instruments enable row level security;

-- Owner-only, all operations: a follow list is personal data.
drop policy if exists follows_instruments_owner_all on follows_instruments;
create policy follows_instruments_owner_all on follows_instruments
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
