# External services

Every paid/freemium service this project integrates with, and where to manage it.

| Service | Purpose | Dashboard | Required? |
|---|---|---|---|
| [Supabase](https://supabase.com) | Postgres, Auth, Storage, RLS | https://supabase.com/dashboard | Yes |
| [Yahoo Finance](https://finance.yahoo.com) (via `yahoo-finance2`) | Primary market data provider — quotes for locking/resolving calls | No dashboard, no key required | Yes (default provider) |
| [Twelve Data](https://twelvedata.com) | Fallback market data if Yahoo fails | https://twelvedata.com/account | No — optional fallback |
| [Alpha Vantage](https://www.alphavantage.co) | Last-resort fallback market data | https://www.alphavantage.co/support/#api-key | No — optional fallback |
| [Kaggle](https://www.kaggle.com) | Reference datasets (SEC financials, S&P futures) via `npm run import:kaggle` | https://www.kaggle.com/settings | No — optional |
| [DeepSeek](https://platform.deepseek.com) | Fact-checker claim extraction/classification + compose AI assist + built-in diagrams | https://platform.deepseek.com | No — mock fallback without a key |
| [OpenAI](https://platform.openai.com) | Audio brief TTS (`tts-1`, ~$15/1M chars ≈ **$0.01–0.02 per 60s brief**) | https://platform.openai.com/api-keys | No — audio brief button disabled until `OPENAI_API_KEY` is set |
| [Napkin AI](https://www.napkin.ai) | Compose editor — text-to-diagram visuals (`/napkin`, toolbar) | https://app.napkin.ai (Developers tab) | No — block hidden until `NAPKIN_API_KEY` is set |
| [Bunny Stream](https://bunny.net/stream/) | **Video — the product's lead medium.** Encoding, global CDN, token-authenticated embeds, TUS upload | https://dash.bunny.net → Stream | No — a mock provider serves public sample clips without keys |
| [PayPal](https://paypal.com) — Partner Referrals / Commerce Platform for Marketplaces | Real creator payouts + onboarding KYC (handled by PayPal itself during signup) | https://developer.paypal.com/dashboard/applications | No — internal wallet is the default economy until configured |

## Notes

- **Video provider is abstracted** behind `VideoProvider` (`src/lib/video/provider.ts`): Bunny Stream is the platform (encoding, global CDN, token-authenticated embeds, TUS resumable upload). No component imports a provider directly; everything goes through `/api/video/upload`, `/api/video/token`, and the webhook. Env: `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_CDN_HOSTNAME`. Full spec: `docs/VIDEO.md`.
- **Market data provider is abstracted** behind `MarketProvider` (`src/lib/engine/market/types.ts`), with Yahoo Finance as the primary implementation (`providers/yahoo.ts`) and Twelve Data / Alpha Vantage as optional fallbacks in `providers/chain.ts`. No code outside `src/lib/engine/market/` calls a vendor directly — swap or add a provider there only.
- **PayPal, not Stripe.** Stripe Connect payouts aren't available for Israel-based platforms/sellers; PayPal is. PayPal is additive, not required — the demo wallet (`wallets` / `wallet_transactions`, seeded with $100 on signup) is the live payment rail today. PayPal Partner Referrals scaffolding (schema, `src/lib/paypal/`, webhook route) is in place so real money can be layered in later without another schema migration — see `docs/ROADMAP.md`. Unlike Stripe, PayPal has no separate "Identity" product: onboarding itself is the KYC step, so there's no second vendor relationship to add later.
- **AI vendor is DeepSeek** (`deepseek-v4-pro` by default), with a deterministic mock fallback when `DEEPSEEK_API_KEY` is unset (`src/lib/fact-check/claim-extraction.ts`), so local dev and CI never depend on a live key. Keys pasted into Vercel are trimmed of trailing newlines/control chars in `src/lib/ai/llm.ts`.
- **Audio briefs** use DeepSeek (optional) for the spoken script and **OpenAI `tts-1`** for MP3 synthesis (`src/lib/ai/tts.ts`). User cost: 3 AI credits. Platform TTS cost: ~$0.01–0.02 per brief at current OpenAI pricing.
- **Graphify** (`src/lib/ai/graphify/`) compresses analyst prose to high-signal excerpts before every DeepSeek call — fewer tokens, lower cost. Credits include a small surcharge (+1 per 1k input tokens above the soft budget) via `src/lib/ai/token-economy.ts`.
- **AI credit pricing:** **$1 → 100 credits** ($0.01/credit). Blended DeepSeek cost ≈ $0.00069/credit → **~93% gross margin**. See `src/lib/ai/credits.ts`.
- **Napkin AI** powers optional diagram generation in Compose via `POST /api/ai/napkin` (`NAPKIN_API_KEY` server-only). Generated PNGs are downloaded and re-hosted on Supabase `report-images` so readers never hit expiring Napkin URLs.
