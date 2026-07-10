-- Cached price / market-cap for browse, Discover cap filters, and screener scope.

alter table tickers
  add column if not exists last_price numeric(14, 4),
  add column if not exists market_cap bigint,
  add column if not exists cap_band text check (cap_band in ('mega', 'large', 'mid', 'small')),
  add column if not exists metrics_updated_at timestamptz;

create index if not exists tickers_cap_band_idx on tickers (cap_band) where status = 'active';
create index if not exists tickers_metrics_updated_idx on tickers (metrics_updated_at desc nulls last);
create index if not exists tickers_market_cap_idx on tickers (market_cap desc nulls last) where status = 'active';

comment on column tickers.last_price is 'Last refreshed spot price (USD)';
comment on column tickers.market_cap is 'Last refreshed market capitalization (USD)';
comment on column tickers.cap_band is 'Derived from market_cap: mega/large/mid/small';
comment on column tickers.metrics_updated_at is 'When last_price and market_cap were last refreshed';
