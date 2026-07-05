# DATA_STACK.md — Stoa market-data & technology stack

> Durable reference for the research-platform build (spec v3, Section 1). This is the contract
> every data feature is built against. If a component needs a number, it comes through the layer
> described here — never from a provider SDK or a `fetch()` in a component.

## 0. The one rule

**Components call `src/lib/market/*` only.** They never import a provider client, never call
`data.sec.gov` / `finnhub.io` / a Data Service URL directly, and never hold an API key. Every
external payload is validated with `zod` at the layer boundary before it is allowed upward. This is
the same discipline `src/lib/db/*` enforces for Supabase — one place that talks to the outside
world, typed on the way in.

Why: rate limits, caching, symbol normalization, provider fallback, and ToS compliance all have to
live in exactly one place or they will drift. It also means we can swap Finnhub for a paid tier, or
move a call from EDGAR to the Data Service, without touching a single component.

## 1. Architecture

The best financial tooling is written in Python; Stoa is TypeScript. So the stack is split:

- **Two clean HTTP sources** (SEC EDGAR, Finnhub) are called **directly from Next.js** server code,
  behind `src/lib/market/*`. They are simple JSON-over-HTTP, no SDK, no scraping.
- **Everything Python-shaped** (OpenBB, finvizfinance, mstarpy, yfinance) runs in a **self-hosted
  Stoa Data Service** (FastAPI) that the market layer talks to over HTTP. Scrapers and
  AGPL-licensed code stay isolated in that sidecar and never enter the Next.js app.

```
Next.js ─► src/lib/market/*  ─► SEC EDGAR (free, official, citable)
                              ─► Finnhub  (free 60/min: quotes, fundamentals, news, insiders)
                              ─► FMP      (MCP connected here; modeled fundamentals, peers)
                              ─► Stoa Data Service (FastAPI):
                                    OpenBB · finvizfinance · mstarpy · yfinance
```

### Directory shape (target)

```
src/lib/market/
  index.ts            Barrel — the only import surface for components/hooks.
  types.ts            Shared zod schemas + inferred types (Quote, Statement, Segment, ...).
  symbols.ts          Symbol normalization (see §5).
  cache.ts            Cache helpers (TTL by data class, see §6).
  edgar.ts            SEC EDGAR companyfacts / companyconcept (the citable anchor).
  finnhub.ts          Real-time quotes, fundamentals, earnings, news, insider sentiment.
  fmp.ts              Modeled fundamentals + peers (via the connected MCP).
  data-service.ts     Typed client for the FastAPI sidecar (§4 endpoints).
  fallback.ts         Alpha Vantage / Twelve Data / Tiingo / Polygon / EODHD behind one face.
  candle-types.ts     (exists) OHLC candle types for chart hydration.
  chart-annotations.ts(exists) entry/target/stop annotation model.
```

Existing files (`candle-types.ts`, `chart-annotations.ts`) already live here — extend, don't fork.

## 2. Primary sources (and why each)

### 2.1 SEC EDGAR — `data.sec.gov` (the on-brand anchor)

- **Free, official, no key.** The source of truth for any *citable* figure or statement — which is
  exactly the notary/ledger brand: a number a reader can trace back to a filing.
- Endpoints: `companyfacts` (all XBRL facts for a CIK) and `companyconcept` (one concept, e.g.
  `Revenues`, across periods). JSON.
- **Constraints:** 10 requests/second cap; a real, descriptive `User-Agent` header is **required**
  (set `SEC_EDGAR_USER_AGENT`, e.g. `"Stoa research platform contact@stoa.example"`); no CORS →
  must be server-side and cached.
- Used for: `statementNode` (A4), the "source of truth" chip on any figure, the "find in filings"
  picker (A10).

### 2.2 Finnhub (real-time breadth)

- **Free tier: 60 calls/min.** Real-time US quotes, company fundamentals, earnings, news + news
  sentiment, insider sentiment, filing search. WebSocket streaming (≤50 symbols).
- Paid ~$50/mo unlocks commercial use + international coverage.
- Used for: live quotes, `estimatesNode` (A7) consensus + price targets, news/sentiment, insider
  data.

### 2.3 FMP — Financial Modeling Prep (already an MCP here)

- Broad fundamentals + full statements + peer lists. ~250 requests/day free.
- Used for **modeled** fundamentals and peers (A6 comparison, A7 estimates). **EDGAR remains the
  citable source of truth**; FMP is convenience/modeled data, labeled as `provider` not `filing`.

### 2.4 Fallbacks (behind the same layer, `fallback.ts`)

Alpha Vantage (free technicals, 25 req/day — last resort), Twelve Data (~800 req/day), Tiingo,
Polygon, EODHD. A component never knows a fallback fired; the layer degrades quietly and stamps the
provider on the returned payload.

## 3. The Data Service (Python sidecar — scraped/ToS-sensitive, isolated)

Runs as its **own deployment** (Fly.io / Railway), reached via `DATA_SERVICE_URL`. Everything here
is delayed, scraped, or ToS-sensitive: **cache it, attribute it, and never present it as
authoritative where EDGAR or Finnhub can be used instead.**

| Repo | Role | License / note |
|------|------|----------------|
| `OpenBB-finance/OpenBB` | Aggregator over ~100 providers; local REST (`openbb-api`) + MCP. | **AGPLv3** — run **unmodified** as an isolated sidecar. **Do not fork into the app.** |
| `lit26/finvizfinance` (or `mariostoev/finviz`) | Screener, fundamentals, insider, analyst targets, news. | 15–20 min delayed. |
| `Mael-J/mstarpy` | Morningstar stocks / funds / screener. | v10+ needs headed Chrome → headless-browser container. `caiobran/mstables` for bulk fundamentals. |
| `ranaroussi/yfinance` | No key; broad quotes/history/fundamentals. The default inside the service. | Scraped Yahoo data. |

### Endpoints the service exposes (typed in `data-service.ts`)

```
GET /v1/fundamentals/{ticker}
GET /v1/statements/{ticker}        income | balance | cashflow, N years
GET /v1/segments/{ticker}          company-specific segments & KPIs (A5)
GET /v1/estimates/{ticker}         consensus estimates vs actuals (A7)
GET /v1/peers/{ticker}             peer set (A6)
GET /v1/screener                   filter the covered universe (Part G)
GET /v1/transcripts/{ticker}       earnings-call transcripts (A15)
```

## 4. Editor / video / supporting libraries

### 4.1 TipTap add-ons (Compose, Part A)

- **TableKit** (`@tiptap/extension-table-kit`) — real tables.
- **Official Drag Handle** — block drag (already partly wired, Phase 1.1).
- **Typography** — smart quotes/dashes (respect the zero-em-dash rule in user copy).
- **CharacterCount** — reading-length + limits.
- **Mathematics** (KaTeX) — `mathNode` (A11) valuation formulas.
- **AI Toolkit** — upgrades `ask-panel.tsx` into an in-document agent (A13 Copilot).
- **Import/Export DOCX/MD** — Pro extension *or* the docx/pdf document skills server-side (Part E).

> Every new block still follows the four-touch pattern and registers through the single
> `buildExtensions()` so editor and `report-renderer.tsx` stay identical. See
> `docs/AGENT_SKILLS.md` and the `stoa-market-data` skill.

### 4.2 Video (Part D) — one provider interface

`src/lib/video/provider.ts` is the only surface components use. **Cloudflare Stream** is the
default (encoding included, signed playback tokens); **Mux** (`@mux/mux-node` +
`@mux/mux-player-react`, Mux Data, DRM, transcripts) is a drop-in swap when analytics matter.
Playback is gated by a signed token from `GET /api/video/token`, which runs `canReadReport` + plan
rank server-side.

### 4.3 Libraries

- `decimal.js` — **all money and valuation math** (never native floats for currency). Backs
  `src/lib/valuation/model.ts` (A1) — see the `stoa-valuation` skill.
- `zod` — validate **every** external payload at the market-layer boundary. Non-negotiable.
- `culori` — OKLCH color math for the bounded creator accent (Part B1).
- `hls.js` — HLS playback fallback where a native player is unavailable.

## 5. Symbol normalization (`symbols.ts`)

One canonical symbol form in, provider-specific forms out. Uppercase, trim, strip exchange
prefixes we don't use, map class shares consistently (e.g. `BRK.B` vs `BRK-B` differs by provider).
Every provider adapter converts to/from the canonical form so a ticker typed once in a block works
across EDGAR (needs CIK lookup), Finnhub, FMP, and the Data Service.

## 6. Caching (`cache.ts`) — TTL by data class

Cache aggressively; respect rate limits; **stamp `asOf` on everything** so blocks can cache the
figure at publish (invariant #2).

| Data class | Example | TTL guidance |
|------------|---------|--------------|
| Real-time quote | last price | seconds (or WebSocket) |
| Intraday candles | 1m/5m OHLC | minutes |
| Daily candles / history | EOD | hours |
| Fundamentals / statements | 10-K/10-Q facts | days (they change only on a new filing) |
| Filing metadata | accession, filing date | days |
| Screener / peers | universe scans | hours |

**Publish-time capture (invariant #2):** any number a *reader* sees is written into the node's
attributes at publish and never recomputed on read — the same way `chartNode.screenshotUrl` bakes
the chart image. Live re-fetch is for the *composer*, not the reader.

## 7. Gating & security (invariant #3)

Paid data surfaces are gated **twice**: server-side (`canReadReport`, signed media tokens for
video/images) **and** Supabase RLS on the underlying tables. A market-data call that hydrates a
gated block must run behind the server entitlement check; never trust a client-supplied price, and
never let `report_bodies` be reachable by a direct client table read.

## 8. Environment variables

```
SEC_EDGAR_USER_AGENT       required by EDGAR; descriptive + contact
FINNHUB_API_KEY            Finnhub free/paid key
DATA_SERVICE_URL           base URL of the FastAPI sidecar
# fallbacks (optional, already partly present in .env.example)
TWELVE_DATA_API_KEY
ALPHA_VANTAGE_API_KEY
# video (Part D)
CLOUDFLARE_STREAM_ACCOUNT_ID / _API_TOKEN / _SIGNING_KEY   (or MUX_TOKEN_ID / MUX_TOKEN_SECRET)
```

Server-only secrets never appear in client components or `NEXT_PUBLIC_*` (AGENTS.md code rule 15).

## 9. Invariants this doc enforces

1. Components call `src/lib/market/*` only — never a provider directly (spec invariant #4).
2. Every external payload is `zod`-validated at the boundary.
3. Scrapers/AGPL code stay in the isolated Data Service; never forked into the app.
4. EDGAR/Finnhub are authoritative; Data Service + FMP are labeled modeled/delayed and attributed.
5. Reader-facing numbers are cached in node attrs at publish, not recomputed on read.
6. All figures render in `.num` (IBM Plex Mono, tabular). See `docs/DESIGN_LANGUAGE.md`.
