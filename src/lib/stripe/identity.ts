/**
 * Stripe Identity — mandatory creator KYC ("this is a real person").
 * Distinct from Connect onboarding ("this is where their money goes") — both
 * are required before a creator can publish paid content for real money.
 */

import { getStripe } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

export interface VerificationSessionResult {
  clientSecret: string;
  sessionId: string;
}

/** Creates a Stripe Identity VerificationSession and records it as pending. */
export async function createVerificationSession(userId: string): Promise<VerificationSessionResult> {
  const stripe = getStripe();
  const admin = createAdminClient();

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { stoa_user_id: userId },
  });

  await admin.from("identity_verifications").insert({
    user_id: userId,
    provider: "stripe_identity",
    provider_session_id: session.id,
    status: "pending",
  });

  return {
    clientSecret: session.client_secret ?? "",
    sessionId: session.id,
  };
}

/** Marks a session verified/failed from a webhook event and syncs `profiles.identity_verified`. */
export async function handleVerificationOutcome(sessionId: string, status: "verified" | "failed") {
  const admin = createAdminClient();

  if (status === "verified") {
    await admin.rpc("mark_identity_verified", { p_session_id: sessionId });
    return;
  }

  await admin
    .from("identity_verifications")
    .update({ status: "failed" })
    .eq("provider_session_id", sessionId);
}
