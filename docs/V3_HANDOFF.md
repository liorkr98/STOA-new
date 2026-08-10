# V3 Research Platform — Handoff & Audit

> **Archived / historical.** This is a point-in-time handoff for the `feat/research-platform-v3`
> branch, kept for reference only. It predates the current product model
> (`docs/PRODUCT_MODEL.md`) and is not live guidance.

Branch: `feat/research-platform-v3`. Everything below was built without a local `npm install`
(network-blocked environment), so **the cloud build is the verification step**. Nothing here has
run through `tsc` locally. This doc is the single checklist for merging, auditing, and finishing.

## 1. What landed (summary)

| Area | Delivered |
|------|-----------|
| Docs & skills | `docs/DESIGN_LANGUAGE.md`, `docs/DATA_STACK.md`, `docs/AGENT_SKILLS.md`; MASTER.md v3 addendum; 3 project skills under `.agents/skills/` |
| Design system | `src/lib/design/chart-theme.ts` (all chart scales); density + data-viz canon |
| Market layer | `src/lib/market/*`: EDGAR (citable statements/concepts), Finnhub (quotes/estimates/news/metrics), FMP (peers/comparisons), zod-validated, TTL-cached |
| Composer blocks (12) | statement (A4), estimates (A7), comparison (A6), embed (A9), image (A8), sourced figure + find-in-filings (A10), valuation DCF (A1), scenario (A2), video (A12/D) + existing chart/figure/compare/table |
| Valuation math | `src/lib/valuation/model.ts` (decimal.js, pure) + `model.test.ts` (`npm run test:valuation`) |
| Copilot (A13) | `ask-panel.tsx` inserts real pre-filled research blocks; multi-ticker detection |
| Plans (C) | Migration (plans/coupons/min_plan_rank), plan-aware paywall RLS, `subscribe_to_plan` RPC, `canReadReport`/`meetsPlanRank`, PlanManager UI on `/studio/branding` |
| Video (D) | Cloudflare Stream provider, upload/webhook/token routes, videoNode with locked-tease (per-block gating UI) |
| Notebook (F) | Schema + RLS, data layer, actions, board UI (`/notebook`), SaveToNotebookButton (wired on figure block) |
| Investor (G) | Company page financials (EDGAR + estimates), `/portfolio`, `/screener`, `/dashboard` (drag widgets) |
| Branding (B) | B1 custom accent (culori, WCAG-gated, scoped) + B2 font pairings — on `/studio/branding` |
| Versioning (E) | Autosave snapshots into `report_versions` (5-min throttle) |
| Fixes | Added missing `server-only` dep (latent build bug); lucide icon-name safety pass |

New deps in `package.json` (cloud install picks up): `decimal.js`, `culori`, `server-only`.

## 2. Steps only you / Krisi can do (in order)

1. **Merge or check out the branch, run `npm install`** (refreshes `package-lock.json` with the 3
   new deps), then `npm run build`, `npm run lint`, `npm run typecheck`,
   `npm run test:engine`, `npm run test:valuation`. Fix-forward anything the build flags — the
   most likely failure class is a lucide icon export name or a strict-TS nit in the new files.
2. **Apply the migration**: `supabase/migrations/0023_research_platform.sql`
   (`supabase db push` or Krisi's flow). It creates plans/coupons/video_assets/notebooks/
   report_versions, extends the `report_bodies` paywall (backward-compatible), adds
   `subscribe_to_plan`, and creates the `report-images` storage bucket.
3. **Set env vars** (Vercel + local `.env.local`; all optional, features degrade without them):
   `SEC_EDGAR_USER_AGENT` (required for statements/figures — any descriptive string with contact),
   `FINNHUB_API_KEY`, `FMP_API_KEY`,
   `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_STREAM_API_TOKEN` / `CLOUDFLARE_STREAM_WEBHOOK_SECRET`.
4. **Cloudflare Stream setup** (when video matters): create the API token, subscribe a webhook to
   `https://<domain>/api/webhooks/cloudflare-stream`, put its secret in the env var.
5. **Backend items for Cursor/Krisi** (out of Claude's lane per team split):
   - Alerts cron (price/filing/earnings + "creator I follow published on a ticker I hold") using
     the existing notifications infra.
   - Coupon redemption RPC (`coupons` table exists; needs a SECURITY DEFINER redeem function wired
     into checkout).
   - Storefront subscribe flow move from `subscribe_to_analyst` to `subscribe_to_plan` (UI exists;
     the confirm dialog needs the plan picker).
   - Optional: Stoa Data Service (FastAPI sidecar) per `docs/DATA_STACK.md` §3 for segments (A5),
     transcripts (A15), and deeper screening.

## 3. Audit checklist (run after merge + migration)

- [ ] `npm run build` + `typecheck` + `lint` pass clean.
- [ ] `npm run test:engine` and `npm run test:valuation` pass.
- [ ] **Paywall integrity**: view-source a gated report logged-out — no body content in HTML.
- [ ] **Plan-rank gating**: set a report `min_plan_rank=1`, confirm a rank-0 subscriber cannot read
      the body (RLS) and `canReadReport` agrees.
- [ ] **Video gate**: request `/api/video/token` for a gated report as a non-subscriber → 403;
      the block renders the blurred locked tease.
- [ ] **Editor/reader parity**: insert each of the 12 blocks, publish, confirm identical render
      in the reading view (single `buildExtensions()`).
- [ ] **Publish capture**: statement/estimates/comparison/valuation blocks render for a logged-out
      reader with **zero** market API calls (data baked in node attrs).
- [ ] **EDGAR politeness**: statements pull sequentially; `SEC_EDGAR_USER_AGENT` set.
- [ ] **Accent bounds**: try a pale yellow accent — picker rejects it; storefront re-validates.
- [ ] **Design rules**: no new hex in components (CSS vars only), all figures in `.num`,
      `.ledger-card` only on trust-critical blocks, reduced-motion clean.
- [ ] Image upload works (`report-images` bucket from the migration).

## 4. Remaining work — ready-to-paste prompts

Paste any of these to Claude Code (design/frontend) or Cursor (backend) to continue:

**A3 — annotated chart upgrade** (careful: edits working code)
> In stoa-next, extend `chartNode` annotations (src/components/editor/tiptap/nodes/chart-node-view.tsx) with entry/target/stop semantic hlines (colored --up/--down/--ink per docs/DESIGN_LANGUAGE.md) and label pins, so they bake into the publish screenshot. Do not regress the existing hline/trend tools. Read docs/FRONTEND.md and the stoa-design-system skill first.

**A11 — math block**
> Add `@tiptap/extension-mathematics` + `katex` to stoa-next and register a mathNode following the four-touch pattern in docs/AGENT_SKILLS.md (KaTeX styles imported once). Slash item "Formula", group Data, icon Sigma.

**A14/A15 — earnings digest + transcripts**
> Build A14 (one-click earnings/filing digest into a cited callout via /api/ai/compose) and A15 (transcript pull via the Data Service /v1/transcripts, keyword search, insert-as-blockquote-with-citation). Requires DATA_SERVICE_URL; see docs/DATA_STACK.md §3.

**A17 — citation ledger**
> Extend the fact-check panel so each claim can carry a SourceRef (same shape as dataFigureNode.sourceRef) and render a visible "Sources" ledger at the end of the reading view, collecting every sourced figure/statement/embed in the doc.

**B3 — storefront sections**
> Revive the ORPHANED section editor at src/components/profile/branding-editor.tsx (drag + visibility already built, wired nowhere). Add section types richText, faq, trackRecord, featuredReport to ProfileSection, build a public renderer used by analyst/[handle]/page.tsx, and wire the editor into /studio/branding. The disclaimer block must NOT become a section (AGENTS.md rule 11).

**B4 — layout presets + paper texture**
> Add storefront layout presets (list/grid/magazine) to ProfileConfig, applied in the analyst page report list, plus the optional <=3% paper texture from docs/DESIGN_LANGUAGE.md §2 (storefront only, default off, reduced-motion gated).

**C — storefront plan checkout**
> Replace the storefront SubscribeButton flow with a plan picker (listActivePlans + perks matrix per docs spec Part C), confirm through the existing spend-confirm dialog showing cost/fee/net, and call the subscribe_to_plan RPC. Keep the legacy scalar path as fallback when an analyst has no plans.

**E — version history UI + export**
> 1) Add a "History" panel in the studio editor listing report_versions (time-grouped) with restore-as-draft. 2) Add report export: a server route that renders TipTap JSON via report-renderer to printable HTML/PDF (docx via the anthropics document skills later), gated by canReadReport.

**F — compose-from-notebook**
> The Notebook board links to /studio/compose?notebook=<id>. Make the editor read that param, fetch entries via listEntriesAction, and seed the doc: snippets as blockquotes with citations, figures as dataFigureNodes, charts as chartNodes. Also add SaveToNotebookButton to statement/estimates/comparison reading views and reader text selection.

**G — watchlist columns + alerts**
> 1) Rebuild /watchlist on the DataTable pattern with custom columns (price, day %, P/E via screener route) and summary row. 2) (Cursor) Implement alerts: an alerts table + pg_cron job checking price/earnings/filings conditions, delivering through the existing notifications system.

**Data Service (Cursor)**
> Stand up the FastAPI sidecar per docs/DATA_STACK.md §3 (yfinance default; finvizfinance; OpenBB as isolated AGPL sidecar) exposing /v1/fundamentals /statements /segments /estimates /peers /screener /transcripts. Deploy on Fly/Railway, set DATA_SERVICE_URL.

### Part H (engagement layer) — schema (0024) + H1 shipped; remaining prompts

Hard rule for all of H: community sentiment NEVER feeds the scoring cron or any HIT/MISS record;
H surfaces use `surface` cards (never `.ledger-card`) and carry "community sentiment - not
investment advice."

**H1 polish — ticker autocomplete + add-to-prediction**
> The tickerMark ($NVDA converts as you type, live hover card in the reader) is live. Add: (1) a $-triggered autocomplete popup reusing the slash-menu suggestion machinery (src/components/editor/tiptap/slash-menu.ts render pattern) listing UNIVERSE matches; (2) an "add to prediction" action on the hover card that prefills the Lock & Publish ticker; (3) mount TickerHoverLayer in the editor surface too (it currently mounts in report-renderer).

**H2 — micro-debates on claims**
> claim_votes table exists (0024; replies reuse the existing debate_comments). Add bull/bear tap + tally to the claim popovers in src/components/report/fact-check-layer.tsx, with a db layer src/lib/db/claim-votes.ts and optimistic toggle. Tallies are community sentiment only — never scored, never ledger-card styled.

**H3 — community polls**
> polls/poll_options/poll_votes exist (0024, plan-rank RLS, one vote per user, closes_at enforced). Build: src/lib/db/polls.ts + actions, a PollCard (horizontal bars, categorical palette from chart-theme, tabular %, "community sentiment - not a call" line), a create-poll dialog in the studio (kinds: sentiment/choice/coverage/target with bucketed targets), and render on report + storefront + feed.

**H4 — audio briefs**
> On publish (or on demand), generate a ~60s TTS brief (thesis, target, horizon, key risk) via the existing OpenAI integration (spendAiCredits metering), store at Supabase storage report-audio/<reportId>, add a minimal player in the reading view. Premium-gated via meetsPlanRank.

**H5 — social watchlists** (needs backend: watchlists table first — current watchlist is localStorage)
> Create a watchlists table (owner, name, is_public, tickers[]) + RLS, migrate the localStorage hook, add follow + a mover-notification cron ("X in @handle's list moved >=5%") through the existing notifications system.

**H6 — Rising Stars league** (mostly Cursor)
> QuickPost short predictions (N/week cap) scored by the existing cron into a weekly Rising Stars board. Promotion guardrail: verified-Analyst requires a long, risk-adjusted, minimum-sample record — one hot month is not enough; "can charge money" is a separate, higher bar.

### Part Z — parked, do NOT build (legal review required)
Research bounties and referral-unlock paywalls are parked pending securities counsel — do not
build these even if asked casually; require an explicit legal go-ahead in the request.

## 5. Known risks

- **Unverified build**: ~9k lines never typechecked locally. Likely failure classes: lucide icon
  export names (already mitigated once), strict-TS nits, `culori` type exports.
- **Migration ordering**: 0023 assumes 0001–0022 applied.
- **Finnhub free tier**: some fields (revenue estimates, price-target details) are paid-plan; the
  code returns honest nulls.
- **Legacy pricing coexistence**: PricingPanel scalars still drive the live subscribe flow until
  the C-checkout prompt above is done; PlanManager writes the new tables in parallel.
