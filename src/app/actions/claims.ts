"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ClassifiedClaim } from "@/lib/fact-check/claim-classification";
import { toClaimRows } from "@/lib/fact-check/claim-classification";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue");
  return { supabase, userId: user.id };
}

/**
 * Persists a fact-check run's classified claims to the `claims` table for a
 * draft the caller owns. Safe to call repeatedly while editing — replaces the
 * previous run's claims each time. A DB trigger blocks this entirely once the
 * report locks (see migration 0013), so this silently no-ops post-publish
 * rather than surfacing a confusing error mid-read-only-view.
 */
export async function persistClaims(reportId: string, reportText: string, claims: ClassifiedClaim[]) {
  const { supabase, userId } = await requireUser();

  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id, locked_at")
    .eq("id", reportId)
    .single();

  if (!report || report.author_id !== userId || report.locked_at) {
    return { ok: false as const };
  }

  await supabase.from("claims").delete().eq("report_id", reportId);

  const rows = toClaimRows(reportText, claims).map((row) => ({ ...row, report_id: reportId }));
  if (rows.length > 0) {
    const { error } = await supabase.from("claims").insert(rows);
    if (error) return { ok: false as const, error: error.message };
  }

  return { ok: true as const, count: rows.length };
}

/** Debate comment on a single claim — server-side check that the claim is opinion-tier, mirrored by RLS. */
export async function postDebateComment(claimId: string, body: string) {
  const { supabase, userId } = await requireUser();
  const text = body.trim();
  if (!text) return { error: "Comment is empty" };
  if (text.length > 1000) return { error: "Comments are limited to 1000 characters." };

  const { data: claim } = await supabase.from("claims").select("id, verdict, report_id").eq("id", claimId).single();
  if (!claim) return { error: "Claim not found" };
  if (claim.verdict !== "opinion") {
    return { error: "Debate is only open on claims classified as opinion." };
  }

  const { error } = await supabase
    .from("debate_comments")
    .insert({ claim_id: claimId, author_id: userId, body: text });
  if (error) return { error: error.message };

  revalidatePath(`/report/${claim.report_id}`);
  return { ok: true };
}
