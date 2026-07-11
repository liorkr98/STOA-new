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
| [PayPal](https://paypal.com) — Partner Referrals / Commerce Platform for Marketplaces | Real creator payouts + onboarding KYC (handled by PayPal itself during signup) | https://developer.paypal.com/dashboard/applications | No — internal wallet is the default economy until configured |
| [Vercel](https://vercel.com) | Hosting, edge middleware, cron jobs | https://vercel.com/liorkr98s-projects/stoa-new | Yes |
| [Voicebox](https://github.com/jamiepine/voicebox) | Self-hosted TTS with clone/persona voices for audio briefs | https://voicebox.sh | No — `OPENAI_API_KEY` fallback |

## Audio briefs (DeepSeek script + Voicebox/OpenAI TTS)

- **Script:** DeepSeek (`DEEPSEEK_API_KEY`) — brief (~60s), extended (3–5 min), or full narration.
- **Speech:** [Voicebox](https://github.com/jamiepine/voicebox) via `VOICEBOX_API_URL` (self-hosted REST API on port 17493), or OpenAI `tts-1` fallback.
- **Voices:** Stylized finance personas (The Bull, The Oracle, Market Host, etc.) — fun delivery styles, not impersonations.
- **Cache:** One generation per report + voice in `report_audio_briefs` + `report-audio` storage; replays are free for all readers.
- **Pricing (user credits):** 3 credits base (~900 chars / ~60s) + 2 credits per extra 500 chars (cap 25). Example: 5,000-char narration ≈ 20 credits (~$0.20).
- **Platform cost:** Voicebox self-hosted ≈ $0 marginal; OpenAI TTS ≈ $0.015 per 1,000 chars.

Setup Voicebox on a GPU server, create named profiles matching `src/lib/ai/audio/voices.ts`, set `VOICEBOX_API_URL=https://your-voicebox-host:17493` on Vercel.

## Vercel deploys

Project ID: `prj_S05cHjfIQVLDIygss1VM6CZuNIC0` · Dashboard: https://vercel.com/liorkr98s-projects/stoa-new

**Git connected but no deploy on push?** Vercel's GitHub webhook often fails silently. Use a Deploy Hook instead:

1. Vercel → **Settings → Git → Deploy Hooks** → Create hook named `github-main`, branch **`main`**
2. GitHub → **Settings → Secrets and variables → Actions** → New secret **`VERCEL_DEPLOY_HOOK`** = the hook URL
3. Push to `main` — the `Vercel Production Deploy` workflow POSTs the hook and Vercel rebuilds

Also verify in Vercel **Settings → Git**: Production Branch = `main`, deployments not paused, and the GitHub app has access to `liorkr98/STOA-new`.

Setup script (requires `VERCEL_TOKEN` + `.env.local`): `npm run vercel:setup -- --deploy --ref=main`

**Build fails: `CRON_SECRET` contains control character (0x0a)?** The secret was pasted with a trailing newline. Vercel rejects that before the build starts.

Fix (pick one):

1. **Dashboard:** Settings → Environment Variables → `CRON_SECRET` → Edit → re-paste the value with **no newline at the end** (or generate a new hex string) → Save → Redeploy
2. **CLI:** `VERCEL_TOKEN=xxx npm run vercel:fix-cron-secret` (trims invalid chars) or add `--rotate` for a fresh secret

## Notes

- **Market data provider is abstracted** behind `MarketProvider` (`src/lib/engine/market/types.ts`), with Yahoo Finance as the primary implementation (`providers/yahoo.ts`) and Twelve Data / Alpha Vantage as optional fallbacks in `providers/chain.ts`. No code outside `src/lib/engine/market/` calls a vendor directly — swap or add a provider there only.
- **PayPal, not Stripe.** Stripe Connect payouts aren't available for Israel-based platforms/sellers; PayPal is. PayPal is additive, not required — the demo wallet (`wallets` / `wallet_transactions`, seeded with $100 on signup) is the live payment rail today. PayPal Partner Referrals scaffolding (schema, `src/lib/paypal/`, webhook route) is in place so real money can be layered in later without another schema migration — see `docs/ROADMAP.md`. Unlike Stripe, PayPal has no separate "Identity" product: onboarding itself is the KYC step, so there's no second vendor relationship to add later.
- **AI vendor is DeepSeek** (`deepseek-v4-pro` by default), with a deterministic mock fallback when `DEEPSEEK_API_KEY` is unset (`src/lib/fact-check/claim-extraction.ts`), so local dev and CI never depend on a live key. Keys pasted into Vercel are trimmed of trailing newlines/control chars in `src/lib/ai/llm.ts`.
- **Audio briefs** use DeepSeek (optional) for the spoken script and **OpenAI `tts-1`** for MP3 synthesis (`src/lib/ai/tts.ts`). User cost: 3 AI credits. Platform TTS cost: ~$0.01–0.02 per brief at current OpenAI pricing.
- **Graphify** (`src/lib/ai/graphify/`) compresses analyst prose to high-signal excerpts before every DeepSeek call — fewer tokens, lower cost. Credits include a small surcharge (+1 per 1k input tokens above the soft budget) via `src/lib/ai/token-economy.ts`.
- **AI credit pricing:** **$1 → 100 credits** ($0.01/credit). Blended DeepSeek cost ≈ $0.00069/credit → **~93% gross margin**. See `src/lib/ai/credits.ts`.
- **Napkin AI** powers optional diagram generation in Compose via `POST /api/ai/napkin` (`NAPKIN_API_KEY` server-only). Generated PNGs are downloaded and re-hosted on Supabase `report-images` so readers never hit expiring Napkin URLs.
