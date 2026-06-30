-- Reference market data from Kaggle imports (SEC financials, SP futures).
-- Live quotes come from Yahoo Finance; these tables supplement fundamentals and history.

create table company_financials (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  cik text,
  period_end date not null,
  frequency text not null check (frequency in ('annual', 'quarterly')),
  filing_type text,
  revenue numeric,
  net_income numeric,
  total_assets numeric,
  total_liabilities numeric,
  shareholders_equity numeric,
  eps numeric,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (symbol, period_end, frequency)
);

create index company_financials_symbol_idx on company_financials (symbol, period_end desc);

-- Daily/hourly SP benchmark bars aggregated from Kaggle tick data.
create table sp_benchmark_bars (
  id uuid primary key default gen_random_uuid(),
  bar_time timestamptz not null,
  open numeric(14, 4) not null,
  high numeric(14, 4) not null,
  low numeric(14, 4) not null,
  close numeric(14, 4) not null,
  volume bigint,
  source text not null default 'kaggle',
  unique (bar_time, source)
);

create index sp_benchmark_bars_time_idx on sp_benchmark_bars (bar_time desc);

-- Public read for reference data (no PII).
alter table company_financials enable row level security;
alter table sp_benchmark_bars enable row level security;

create policy company_financials_read on company_financials
  for select using (true);

create policy sp_benchmark_bars_read on sp_benchmark_bars
  for select using (true);
