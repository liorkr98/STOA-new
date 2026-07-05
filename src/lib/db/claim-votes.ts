import { createClient } from "@/lib/supabase/server";

/**
 * Bull/bear stances on extracted claims (H2). Community sentiment only: tallies
 * never feed the scoring cron or any track record. Rendered claims come from
 * the fact_check_results JSON (no DB id), so lookup matches the persisted
 * claims row by report + claim_text.
 */

export interface ClaimVoteState {
  claimId: string;
  bull: number;
  bear: number;
  mine: "bull" | "bear" | null;
}

export async function getClaimVotes(
  reportId: string,
  claimText: string,
): Promise<ClaimVoteState | null> {
  const supabase = await createClient();
  const { data: claim } = await supabase
    .from("claims")
    .select("id")
    .eq("report_id", reportId)
    .eq("claim_text", claimText)
    .limit(1)
    .maybeSingle();
  if (!claim) return null;

  const { data: votes } = await supabase
    .from("claim_votes")
    .select("stance, voter_id")
    .eq("claim_id", claim.id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let bull = 0;
  let bear = 0;
  let mine: "bull" | "bear" | null = null;
  for (const v of votes ?? []) {
    if (v.stance === "bull") bull++;
    else bear++;
    if (user && v.voter_id === user.id) mine = v.stance as "bull" | "bear";
  }
  return { claimId: claim.id as string, bull, bear, mine };
}

/** Toggle a stance: same stance removes the vote, a different one replaces it. */
export async function voteClaim(
  claimId: string,
  stance: "bull" | "bear",
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: existing } = await supabase
    .from("claim_votes")
    .select("id, stance")
    .eq("claim_id", claimId)
    .eq("voter_id", user.id)
    .maybeSingle();

  if (existing && existing.stance === stance) {
    const { error } = await supabase.from("claim_votes").delete().eq("id", existing.id);
    return !error;
  }
  if (existing) {
    const { error } = await supabase.from("claim_votes").update({ stance }).eq("id", existing.id);
    return !error;
  }
  const { error } = await supabase
    .from("claim_votes")
    .insert({ claim_id: claimId, voter_id: user.id, stance });
  return !error;
}
