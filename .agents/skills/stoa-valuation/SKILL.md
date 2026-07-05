---
name: stoa-valuation
description: Stoa's valuation math - DCF, multiples, DDM, and scenario weighting - with money-safe decimal arithmetic and rounding conventions. Use this skill when building or editing the valuationNode (A1) or scenarioNode (A2), the pure model in src/lib/valuation/model.ts, or anything that computes a fair value, upside, present value, sensitivity grid, or probability-weighted target.
license: proprietary
metadata:
  author: Stoa
  version: "1.0.0"
  organization: Stoa
  abstract: The DCF/multiples/DDM/scenario formulas, decimal.js money-safety rules, rounding conventions, and the publish-time caching contract for Stoa's valuation blocks. TDD-first.
---

# Stoa Valuation

The math behind the `valuationNode` (A1) and `scenarioNode` (A2). It lives in a pure, tested module
`src/lib/valuation/model.ts` and is consumed by the node views. **Numbers a reader sees are cached
in node attributes at publish, never recomputed on read** (invariant #2, mirrors
`chartNode.screenshotUrl`).

## Money safety (non-negotiable)

- **All money and per-share math uses `decimal.js`.** Never native floats for currency, prices,
  rates, or ratios that roll up into a price. Float drift is a correctness bug in a product whose
  whole point is a trustworthy number.
- Validate every external input (pulled financials) with `zod` before it enters the model. Pulled
  financials come through `src/lib/market/*` only (see the `stoa-market-data` skill).
- The model is **pure** — inputs in, result out, no I/O, no React. This is what makes it testable.

## TDD

Write the test first (pair with `obra/superpowers`). Cover: a golden DCF against a hand-worked
example, terminal-value both ways (Gordon growth and exit multiple), a zero/negative FCF year,
`g >= WACC` guarded (no divide-by-zero, no negative denominator), and scenario probabilities that
must sum to 100%. Run `npm run test:engine`-style node tests.

## DCF

- Project FCF for N explicit years; discount each at WACC:
  `PV_t = FCF_t / (1 + WACC)^t`.
- Terminal value, either:
  - Gordon growth: `TV = FCF_N * (1 + g) / (WACC - g)` (require `WACC > g`), or
  - Exit multiple: `TV = metric_N * exitMultiple`.
- `PV(TV) = TV / (1 + WACC)^N`.
- `EnterpriseValue = sum(PV_t) + PV(TV)`.
- `EquityValue = EV - netDebt` (add net cash if negative net debt).
- `FairValuePerShare = EquityValue / dilutedShares`.
- `Upside = FairValuePerShare / lastPrice - 1` (render as `.num` percent, `--up`/`--down` colored).

Output card shows: fair value/share, upside vs last price, a PV-by-year bar, and a 5x5 sensitivity
heatmap (WACC x growth) using `chartTheme.diverging`.

## Multiples

`ImpliedPrice = peerMultiple * companyMetricPerShare` (P/E, EV/EBITDA → bridge EV to equity first,
then per share). Show the peer set and the chosen multiple with a source chip.

## DDM

`Value = D_1 / (r - g)` (constant growth) or a multi-stage sum of discounted dividends plus a
terminal DDM. Same `r > g` guard.

## Scenario (A2)

Bull / base / bear, each with a price and a probability. **Validator: probabilities sum to exactly
100%** (work in integer basis points or validate the decimal sum). Then:
`WeightedTarget = sum(price_i * prob_i)` and `ExpectedUpside = WeightedTarget / lastPrice - 1`.

## Rounding conventions

- Round **only for display**, never mid-calculation. Keep full `Decimal` precision through the
  chain; round at the node view.
- Prices/fair value: 2 decimals. Percentages: 1 decimal. Large currency: abbreviate (K/M/B/T) in
  `.num` with the `pricing-panel.tsx` adornment convention.
- Never show false precision (a $ target to 4 decimals reads as a machine, not a notary).

## Driving the locked target

Both A1 and A2 can set `drivesTarget` to push the computed value into the Lock & Publish target.
**They are mutually exclusive** — a report drives its target from at most one block. A locked
`valuationNode` that drives the target is trust-critical: render it as a `.ledger-card` and cache
its `computed` result in the node attributes at publish.

## Do / don't

- Do keep the model pure and covered by tests; do cache computed values at publish.
- Don't compute in a component; don't use floats for money; don't recompute on read; don't let two
  blocks both drive the target.
