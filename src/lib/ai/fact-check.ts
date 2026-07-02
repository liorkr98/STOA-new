/**
 * Backward-compatible entry point for the fact-check UI (studio editor,
 * fact-checker panel, report page). The actual pipeline now lives in
 * `src/lib/fact-check/` as pure, independently testable steps — see
 * `claim-extraction.ts` (decomposition) and `claim-classification.ts`
 * (verdict mapping + market-data cross-check + character offsets).
 */

import { extractClaims } from "@/lib/fact-check/claim-extraction";
import { crossCheckWithMarketData, type ClassifiedClaim } from "@/lib/fact-check/claim-classification";

export type { ClaimType } from "@/lib/fact-check/claim-extraction";
export type FactClaim = ClassifiedClaim;

export interface FactCheckResult {
  claims: ClassifiedClaim[];
  checked_at: string;
}

export async function runFactCheck(reportText: string): Promise<FactCheckResult> {
  const classified = await extractClaims(reportText);
  const verified = await crossCheckWithMarketData(classified);
  return { claims: verified, checked_at: new Date().toISOString() };
}
