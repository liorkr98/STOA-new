# Stoa Backend

Server contract for schema, RLS, scoring, payments, storage, and API routes. See also `docs/Stoa_Backend_Deep_Dive.md` for PM-framework amendments.

## Report bodies

`report_bodies.body` stores the compose document as **text** containing JSON (Tiptap doc or legacy block editor). Chart node attributes (`screenshotUrl`, `visibleRange`, `chartType`, `timeframe`, `annotations`) live inside that JSON — no column migration required.

## Chart screenshots (storage)

| Item | Value |
|------|-------|
| Bucket | `chart-snapshots` |
| Public read | Yes (investors load PNGs without auth) |
| Write | Authenticated creator only, path prefix = their `user_id` |
| Path | `chart-snapshots/{user_id}/{report_id}/{node_id}.png` |
| MIME | `image/png` only, 5MB max |

Migration: `supabase/migrations/0020_chart_snapshots_storage.sql`

Publish validates every `screenshotUrl` in the body starts with:

```
{SUPABASE_STORAGE_URL}/chart-snapshots/{creator_id}/{report_id}/
```

## API routes (chart-related)

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/reports/[id]/publish` | Signed in | Publish + chart URL validation + audit |
| `DELETE /api/reports/[id]` | Signed in | Delete draft + remove chart PNGs |
| `GET /api/market/candles` | Signed in | OHLC for chartNode (`symbol` + `range`), 60 req/min/user |

## §10 — Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Publishable/anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; audit log inserts, grading |
| `SUPABASE_STORAGE_URL` | Yes* | `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public` — chart screenshot URL validation |
| `CRON_SECRET` | Prod | Protects `/api/cron/grade` |
| `TWELVE_DATA_API_KEY` | No | Live quote fallback |
| `ALPHA_VANTAGE_API_KEY` | No | Live quote fallback |
| `OPENAI_API_KEY` | No | Fact-check + compose AI |

\*Required once chart screenshots ship; defaults from `NEXT_PUBLIC_SUPABASE_URL` if unset.

Chart candles use Yahoo Finance server-side (`src/lib/engine/market/candles.ts`) — no extra API key.

## §11 — Billing disputes, chargebacks, and clawbacks

Stripe/PayPal disputes are handled as **ledger events**, not silent balance edits.

- Store every dispute lifecycle event in an immutable audit trail (event id, source provider, dispute status, amount).
- If a previously paid analyst sale is disputed and funds are clawed back by the processor, record a compensating negative transfer in `platform_transfers` (or its successor ledger table) instead of mutating historical rows.
- If the analyst balance cannot fully cover clawback immediately, carry the deficit forward as an outstanding platform receivable and net it against future payouts.
- Keep the user-facing transaction history explicit: original sale, dispute opened, dispute resolved, clawback applied.

This is a policy addendum only; it does not change the earnings split architecture.

## §12 — Deletion requests and immutable-call history

Right-to-erasure handling uses **pseudonymization + key severance** for immutable market records.

- Personally identifying profile attributes are erased or replaced with neutral placeholders.
- Authentication data is removed through the auth provider deletion workflow.
- Locked-call artifacts needed for historical scoring/market integrity remain, but are detached from identifying profile fields.
- Keep a minimal compliance record of request execution (request id, timestamp, operator/system actor, scope), excluding personal content.

This is an engineering pattern note, not legal advice; legal/compliance sign-off is required before launch.

## §13 — Prompt-injection baseline (AI endpoints)

Applies to:

- `POST /api/ai/fact-check`
- `POST /api/ai/compose` (ask-panel backend)

Baseline controls:

- Treat analyst input as untrusted data, never instructions.
- Enforce instruction/data separation with explicit wrappers (e.g. `<report_text>`, `<user_message>`) in prompts.
- Sanitize and bound user-provided input before interpolation (control-char stripping, max-length caps).
- Keep fact-check model contract deterministic and bounded (single pass, structured JSON output, no tool loops).

## Profile branding & boosts

`profiles.profile_config` (JSONB) stores storefront layout: `theme_id`, `sections[]`, `specialties`, `social`, `featured_tickers`. MOAT badge and disclosure blocks are **not** brandable.

| Route | Auth | Purpose |
|-------|------|---------|
| `/studio/branding` | Analyst | Branding studio (identity, themes, AI analyzer, pricing, boosts) |
| `POST /api/ai/brand-analyze` | Signed in | AI brand scores + copy suggestions (2 AI credits) |
| `purchase_boost` RPC | Signed in | Debit wallet, activate Discover placement |

### Boost packages (wallet balance)

| Package | Price | Placement |
|---------|-------|-----------|
| Profile 24h | $5 | Researchers + sidebar |
| Profile 7d | $15 | Researchers + sidebar |
| Report 24h | $8 | Trending feed |
| Report 7d | $20 | Trending feed |

Migrations: `0021_profile_boosts.sql`, `0022_boost_polish.sql`
