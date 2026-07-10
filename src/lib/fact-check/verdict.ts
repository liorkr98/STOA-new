import type { ClaimType, FactClaim } from "@/lib/ai/fact-check";

/**
 * The 4-way verdict every claim type collapses to, shared by the reader-facing
 * FactCheckLayer and ReportSchema's ClaimReview JSON-LD -- one mapping, not
 * two that could silently drift apart.
 */
export type Verdict = "fact" | "unproven" | "opinion" | "contradicted";

export const VERDICT_MAP: Record<ClaimType, Verdict> = {
  Fact: "fact",
  "Yahoo-Verified": "fact",
  Unverified: "unproven",
  Opinion: "opinion",
  Misleading: "contradicted",
  "Yahoo-Disputed": "contradicted",
};

export function verdictOf(claim: FactClaim): Verdict {
  return VERDICT_MAP[claim.type] ?? "unproven";
}
