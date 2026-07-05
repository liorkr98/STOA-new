---
name: stoa-market-data
description: Stoa's market-data layer contract and editor-block pattern. Use this skill when adding or editing any market-data endpoint, provider adapter, or TipTap editor block (chart, statement, segment, comparison, estimates, figure, valuation, etc.) - it encodes the providers, caching TTLs, symbol normalization, the zod-at-the-boundary rule, and the four-touch node pattern so every data feature is added identically.
license: proprietary
metadata:
  author: Stoa
  version: "1.0.0"
  organization: Stoa
  abstract: The single-layer market-data contract (providers, caching, normalization, validation) and the four-touch editor-node pattern that keeps editor and reader identical. Pointer skill; docs/DATA_STACK.md is the source of truth.
---

# Stoa Market Data

Source of truth: `docs/DATA_STACK.md`. This skill is the always-loaded summary.

## The one rule

**Components call `src/lib/market/*` only.** Never a provider SDK, never a raw `fetch` to
`data.sec.gov` / Finnhub / the Data Service, never an API key in a component. **Every external
payload is `zod`-validated at the layer boundary** before it goes upward. Same discipline as
`src/lib/db/*` for Supabase.

## Providers (behind the layer)

- **SEC EDGAR** (`data.sec.gov`, free, no key) — the **citable source of truth**. `companyfacts` /
  `companyconcept`. 10 req/s, real `User-Agent` (`SEC_EDGAR_USER_AGENT`), no CORS → server-side +
  cached. Powers `statementNode` (A4) and the "find in filings" picker (A10).
- **Finnhub** (free 60/min) — real-time quotes, fundamentals, earnings, news + sentiment, insider
  sentiment, filing search; WebSocket ≤50 symbols. Powers `estimatesNode` (A7), news.
- **FMP** (MCP here, ~250/day free) — modeled fundamentals + peers (A6). Labeled `provider`, not
  `filing` — EDGAR stays authoritative.
- **Stoa Data Service** (FastAPI sidecar, `DATA_SERVICE_URL`) — OpenBB / finvizfinance / mstarpy /
  yfinance. **Scraped/delayed/ToS-sensitive: cache, attribute, isolated.** Endpoints:
  `/v1/fundamentals /statements /segments /estimates /peers /screener /transcripts`.
- **Fallbacks** (`fallback.ts`) — Alpha Vantage / Twelve Data / Tiingo / Polygon / EODHD, quiet.

## Caching (TTL by data class) + publish capture

Quotes: seconds. Intraday candles: minutes. Daily/history: hours. Fundamentals/statements/filing
metadata: days. Screener/peers: hours. Stamp `asOf` on everything.

**Publish-time capture (invariant #2):** a reader-facing number is written into node attributes at
publish and never recomputed on read (mirrors `chartNode.screenshotUrl`). Live re-fetch is for the
composer only.

## Symbol normalization

One canonical form (uppercase, trimmed) in; provider-specific forms out (EDGAR needs a CIK lookup;
class shares like `BRK.B`/`BRK-B` differ by provider). All adapters convert to/from canonical.

## Gating (invariant #3)

Paid data surfaces gate twice: server (`canReadReport`, signed media tokens) + Supabase RLS. Never
trust a client-supplied price; never let `report_bodies` be read directly by a client.

## The four-touch pattern for a new editor block

`buildExtensions()` stays the single extension set so the editor and `report-renderer.tsx` render
identically (invariant #1). A new block touches exactly four files:

1. **Pure node** — `src/lib/editor/tiptap/nodes/<name>-node.ts`. `Node.create`, `addAttributes`,
   `parseHTML`/`renderHTML` with a `data-<name>-node` tag, `addNodeView`. No React. Cache
   computed/reader-facing values in attributes.
2. **React node view** — `src/components/editor/tiptap/nodes/<name>-node-view.tsx`
   (`ReactNodeViewRenderer`).
3. **Register** — append the node in `src/lib/editor/tiptap/extensions.ts` inside
   `buildExtensions()`.
4. **Slash item** — append to `SLASH_ITEMS` in `src/components/editor/tiptap/slash-menu.ts`,
   `group: "Data"`, a Lucide icon, keywords, and a `run` that `insertContent({ type: "<name>Node" })`.

Reference node: `src/lib/editor/tiptap/nodes/chart-node.ts` (attribute caching via `screenshotUrl`)
and `data-figure-node.ts` (structured `source` attribute).

## Sourced figures (A10)

`dataFigureNode.source = { kind: "filing" | "provider" | "manual", url, asOf, accession, concept }`.
"Find in filings" resolves via EDGAR `companyconcept`. The source travels with the figure and feeds
the fact-checker / citation ledger (A17).

## Do / don't

- Do route every provider call through `src/lib/market/*`; do `zod`-validate at the boundary; do
  cache by data class and stamp `asOf`; do keep scrapers in the Data Service.
- Don't call a provider from a component; don't recompute reader numbers on read; don't add a block
  without all four touches; don't present scraped/delayed data as authoritative.
