# Market Data

Stoa uses a layered data stack: live quotes for grading and publishing, plus optional static reference data for fundamentals and benchmark history.

## Live quotes (grading + markets UI)

| Priority | Provider | Key required | Limits |
|----------|----------|--------------|--------|
| 1 | **Yahoo Finance** ([yahoo-finance2](https://github.com/gadicc/yahoo-finance2)) | No | Unofficial; no hard cap, but can break occasionally |
| 2 | **Twelve Data** | `TWELVE_DATA_API_KEY` | ~800 requests/day free |
| 3 | **Alpha Vantage** | `ALPHA_VANTAGE_API_KEY` | 25 requests/day free (last resort) |
| 4 | **Mock** | — | Deterministic fallback per symbol/day |

Implementation: `src/lib/engine/market/`

- `getQuote(symbol)` — single price
- `getQuotesBatch(symbols)` — batch (Yahoo multi-quote when possible)
- `getBenchmarkQuote()` — SPY for alpha calculation

Python's [yfinance](https://github.com/ranaroussi/yfinance) is the reference library; in Node we use **yahoo-finance2**, which wraps the same Yahoo endpoints.

## Reference data (Kaggle)

Static datasets supplement live feeds. Import with:

```bash
# Add KAGGLE_USERNAME + KAGGLE_KEY to .env.local, then:
npm run import:kaggle
```

Or download manually into `data/kaggle/`:

| Dataset | Folder | Table | Use |
|---------|--------|-------|-----|
| [finnhub/reported-financials](https://www.kaggle.com/datasets/finnhub/reported-financials) | `data/kaggle/reported-financials/` | `company_financials` | SEC 10-K/10-Q line items on ticker pages |
| [finnhub/sp-500-futures-tick-data-sp](https://www.kaggle.com/datasets/finnhub/sp-500-futures-tick-data-sp) | `data/kaggle/sp-futures/` | `sp_benchmark_bars` | Hourly SP benchmark history |

Apply migration `0006_market_reference_data.sql` before importing.

Live fundamentals on `/markets/[ticker]` also pull from Yahoo `quoteSummary` (P/E, market cap, revenue, EPS).

## Additional free sources (not yet wired)

These are good candidates if you need more coverage later:

| Source | Data | Notes |
|--------|------|-------|
| [SEC EDGAR](https://www.sec.gov/edgar) | Filings, XBRL | Official, free, no key; slower than Kaggle bulk |
| [FRED](https://fred.stlouisfed.org/docs/api/) | Macro (rates, CPI, GDP) | Free API key; useful for macro-aware analyst context |
| [Tiingo](https://www.tiingo.com/) | EOD prices, fundamentals | 1,000 req/day free |
| [Stooq](https://stooq.com/) | Historical OHLCV | Free CSV downloads; good for backtests |
| [Wikipedia / Wikidata](https://www.wikidata.org/) | Company metadata | Sector, HQ, descriptions |
| [Polygon.io](https://polygon.io/) | US equities (delayed) | 5 req/min free; grouped daily endpoint is efficient |
| [Finnhub](https://finnhub.io/) | Quotes, news, WS | 60 req/min free — viable fallback if Yahoo is down |

## What you might still need

1. **Run migration 0006** on your Supabase project before Kaggle import.
2. **Kaggle API credentials** — or manual ZIP extract into `data/kaggle/`.
3. **Optional fallback API keys** — Yahoo works without keys; add Twelve Data / Alpha Vantage for resilience.
4. **FINNHUB_API_KEY removed** — no longer used; delete from `.env.local` if present.
5. **CRON_SECRET** — still required for hourly grading on Vercel.
6. **Historical backtesting** — current engine only needs spot prices at publish + resolve; OHLCV would need new tables + UI if you want chart backtests.
7. **News / sentiment** — not in scope yet; Finnhub or Polygon news APIs are options.
8. **International tickers** — Yahoo supports many; grading assumes US-style symbols today.
9. **Rate-limit monitoring** — log when fallbacks trigger (future improvement).

## Environment summary

```bash
# Required for app + grading
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=

# Optional live fallbacks
TWELVE_DATA_API_KEY=
ALPHA_VANTAGE_API_KEY=

# Optional Kaggle import
KAGGLE_USERNAME=
KAGGLE_KEY=
```
