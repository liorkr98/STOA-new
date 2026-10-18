"use server";

import { getClaimVotes, voteClaim, type ClaimVoteState } from "@/lib/db/claim-votes";
import { wallAllows } from "@/lib/gate/server";

/** Claim-vote server actions (H2). Sentiment only -- never scored. */

export async function getClaimVotesAction(
  reportId: string,
  claimText: string,
): Promise<ClaimVoteState | null> {
  if (!(await wallAllows())) return null;
  return getClaimVotes(reportId, claimText);
}

export async function voteClaimAction(
  claimId: string,
  stance: "bull" | "bear",
): Promise<boolean> {
  return voteClaim(claimId, stance);
}
