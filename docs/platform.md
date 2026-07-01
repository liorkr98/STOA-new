# External services

Every paid/freemium service this project integrates with, and where to manage it.

| Service | Purpose | Dashboard | Required? |
|---|---|---|---|
| [Supabase](https://supabase.com) | Postgres, Auth, Storage, RLS | https://supabase.com/dashboard | Yes |
| [Yahoo Finance](https://finance.yahoo.com) (via `yahoo-finance2`) | Primary market data provider — quotes for locking/resolving calls | No dashboard, no key required | Yes (default provider) |
| [Twelve Data](https://twelvedata.com) | Fallback market data if Yahoo fails | https://twelvedata.com/account | No — optional fallback |
| [Alpha Vantage](https://www.alphavantage.co) | Last-resort fallback market data | https://www.alphavantage.co/support/#api-key | No — optional fallback |
| [Kaggle](https://www.kaggle.com) | Reference datasets (SEC financials, S&P futures) via `npm run import:kaggle` | https://www.kaggle.com/settings | No — optional |
| [OpenAI](https://platform.openai.com) | Fact-checker claim extraction/classification + compose AI assist | https://platform.openai.com/account | No — mock fallback without a key |
| [Stripe](https://stripe.com) — Connect (Express) | Real creator payouts, banking KYC, 1099s | https://dashboard.stripe.com/connect/accounts/overview | No — internal wallet is the default economy until configured |
| [Stripe](https://stripe.com) — Identity | Mandatory creator identity verification ("this is a real person") before real-money payouts | https://dashboard.stripe.com/settings/identity | No — same as above |

## Notes

- **Market data provider is abstracted** behind `MarketProvider` (`src/lib/engine/market/types.ts`), with Yahoo Finance as the primary implementation (`providers/yahoo.ts`) and Twelve Data / Alpha Vantage as optional fallbacks in `providers/chain.ts`. No code outside `src/lib/engine/market/` calls a vendor directly — swap or add a provider there only.
- **Stripe is additive, not required.** The demo wallet (`wallets` / `wallet_transactions`, seeded with $100 on signup) is the live payment rail today. Stripe Connect + Identity scaffolding (schema, `src/lib/stripe/`, webhook routes) is in place so real money can be layered in later without another schema migration — see `docs/ROADMAP.md`.
- **AI vendor is OpenAI**, with a deterministic mock fallback when `OPENAI_API_KEY` is unset (`src/lib/fact-check/claim-extraction.ts`), so local dev and CI never depend on a live key.
