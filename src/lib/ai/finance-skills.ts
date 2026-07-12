/**
 * Compact equity-research skill recipes for Research AI.
 * Inspired by institutional initiating-coverage workflows and open finance
 * skill catalogs (structure only; Stoa-owned prompts and data rails).
 */

export const FINANCE_SKILL_CATALOG = `
Skills you can run when the analyst asks (map to editor actions + draft prose):

1) initiating-coverage — full report scaffold
   Sections: company overview, industry/competition, financials, valuation, thesis, catalysts, risks, appendix.
   Prefer apply_template("initiating-coverage") then fill paragraphs with draft prose.
   Insert statement, estimates, chart, valuation, comparison, scenario blocks wired to ticker.

2) earnings-preview / earnings-recap
   Consensus vs history, guidance, margin trends, price reaction. Use estimates + chart + callouts.

3) company-valuation
   Triangulate DCF (valuation block), multiples (comparison), and bull/base/bear (scenario).
   Never invent precise fair value without stating assumptions as editable draft.

4) estimate-analysis
   Insert estimates block; draft revision narrative from market_context when present.

5) catalyst-scan
   Use market_context.news headlines when provided. Draft a catalysts section; do not claim calendar certainty without a cited headline.

6) peer-compare
   insert_comparison / insert_compare with peer tickers from the user or sector peers they name.

Data rules:
- Prefer Stoa live blocks (chart, statement, estimates, valuation) over pasting stale numbers.
- When <market_context> is present, cite those figures and news headlines; say if data is missing.
- Public dataset ideas (FRED, SEC EDGAR, World Bank, etc.) are research pointers — insert blocks and draft where to look; do not fabricate series.
- You may draft section prose the analyst will edit. Label uncertain claims clearly.
- Do NOT set or invent the locked price target / long-short call. Those live in the publish panel.
- Never claim you have real-time news if market_context.news is empty — say so and scaffold a checklist instead.
`.trim();

export type ComposeSkillId =
  | "initiating-coverage"
  | "earnings-recap"
  | "earnings-preview"
  | "company-valuation"
  | "estimate-analysis"
  | "catalyst-scan"
  | "peer-compare";

export function detectComposeSkill(userText: string): ComposeSkillId | null {
  const t = userText.toLowerCase();
  if (/initiat(e|ing)\s+coverage|full\s+research|equity\s+research\s+template|deep\s*dive\s+template/i.test(t)) {
    return "initiating-coverage";
  }
  if (/earnings\s+recap|post[- ]earnings|after\s+earnings/i.test(t)) return "earnings-recap";
  if (/earnings\s+preview|pre[- ]earnings|before\s+earnings/i.test(t)) return "earnings-preview";
  if (/valuat|dcf|fair\s+value|wacc/i.test(t)) return "company-valuation";
  if (/estimate|consensus|\beps\b|revision/i.test(t)) return "estimate-analysis";
  if (/catalyst|what'?s\s+next|upcoming\s+event/i.test(t)) return "catalyst-scan";
  if (/peer|compar|versus|\bvs\b/i.test(t)) return "peer-compare";
  return null;
}
