/**
 * Compact equity-research skill recipes for Research AI.
 * Inspired by institutional initiating-coverage workflows and open finance
 * skill catalogs (structure only; Stoa-owned prompts and data rails).
 */

export const FINANCE_SKILL_CATALOG = `
Skills you can run when the analyst asks (map to editor actions + draft prose):

1) initiating-coverage — full report scaffold (apply_template initiating-coverage)
   Sections: company overview, industry/competition, financials, valuation, thesis, catalysts, risks, appendix.

2) investment-memo — thesis-first memo with valuation triangulation (apply_template investment-memo)

3) deep-dive — long-form company profile with financial history (apply_template deep-dive)

4) comp-analysis — peer multiples, comparison charts, implied valuation (apply_template comp-analysis)

5) equity-factsheet — one-page key facts, performance table, summary chart (apply_template equity-factsheet)

6) company-dashboard — dense KPI grid: chart, health metrics, ratios (apply_template company-dashboard)

7) sector-update — industry narrative with aggregate tables (apply_template sector-update)

8) earnings-preview / earnings-recap — consensus vs history (apply_template earnings-preview | earnings-recap)

9) catalyst-note — near-term events and checklist (apply_template catalyst-note)

10) quick-call — short BUY/SELL note with call block (apply_template quick-call)

11) company-valuation
   Triangulate DCF (valuation block), multiples (comparison), and bull/base/bear (scenario).
   Never invent precise fair value without stating assumptions as editable draft.

12) estimate-analysis
   Insert estimates block; draft revision narrative from market_context when present.

13) catalyst-scan
   Use market_context.news headlines when provided. Draft a catalysts section; do not claim calendar certainty without a cited headline.

14) peer-compare
   Use market_context.peers when present. insert_comparison and insert_compare with [ticker, ...peers] (max 4).

15) filings-deep-dive
   Use market_context.fundamentals + recent_filings. Prefer insert_statement / insert_estimates over inventing line items.

Data rules:
- Prefer Stoa live blocks (chart, statement, estimates, valuation, comparison) over pasting stale numbers.
- When <market_context> is present, cite those figures, filings, peers, and news headlines; say if data is missing.
- For peer work, always pass tickers: [subject, ...peers] on insert_comparison / insert_compare.
- Public dataset ideas (FRED, SEC EDGAR, World Bank, etc.) are research pointers — insert blocks and draft where to look; do not fabricate series.
- You may draft section prose the analyst will edit. Label uncertain claims clearly.
- Do NOT set or invent the locked price target / long-short call. Those live in the publish panel.
- Never claim you have real-time news if market_context news is empty — say so and scaffold a checklist instead.
`.trim();

export type ComposeSkillId =
  | "initiating-coverage"
  | "earnings-recap"
  | "earnings-preview"
  | "company-valuation"
  | "estimate-analysis"
  | "catalyst-scan"
  | "peer-compare"
  | "filings-deep-dive";

export function detectComposeSkill(userText: string): ComposeSkillId | null {
  const t = userText.toLowerCase();
  if (/initiat(e|ing)\s+coverage|full\s+research|equity\s+research\s+template/i.test(t)) {
    return "initiating-coverage";
  }
  if (/investment\s+memo|deal\s+memo/i.test(t)) return "initiating-coverage";
  if (/deep\s*dive|company\s+profile/i.test(t)) return "filings-deep-dive";
  if (/factsheet|one[- ]pager|key\s+facts/i.test(t)) return "initiating-coverage";
  if (/dashboard|stock\s+report/i.test(t)) return "initiating-coverage";
  if (/sector\s+update|industry\s+report/i.test(t)) return "catalyst-scan";
  if (/earnings\s+recap|post[- ]earnings|after\s+earnings/i.test(t)) return "earnings-recap";
  if (/earnings\s+preview|pre[- ]earnings|before\s+earnings/i.test(t)) return "earnings-preview";
  if (/valuat|dcf|fair\s+value|wacc/i.test(t)) return "company-valuation";
  if (/filing|10-?k|10-?q|edgar|fundamentals/i.test(t)) return "filings-deep-dive";
  if (/estimate|consensus|\beps\b|revision/i.test(t)) return "estimate-analysis";
  if (/catalyst|what'?s\s+next|upcoming\s+event/i.test(t)) return "catalyst-scan";
  if (/peer|compar|versus|\bvs\b/i.test(t)) return "peer-compare";
  return null;
}
