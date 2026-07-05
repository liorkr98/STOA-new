"use server";

import { getClaimVotes, voteClaim, type ClaimVoteState } from "@/lib/db/claim-votes";

/** Claim-vote server actions (H2). Sentiment only -- never scored. */

export async function getClaimVotesAction(
  reportId: string,
  claimText: string,
): Promise<ClaimVoteState | null> {
  return getClaimVotes(reportId, claimText);
}

export async function voteClaimAction(
  claimId: string,
  stance: "bull" | "bear",
): Promise<boolean> {
  return voteClaim(claimId, stance);
}
