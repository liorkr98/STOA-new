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
