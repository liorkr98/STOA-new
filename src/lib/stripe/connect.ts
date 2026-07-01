/**
 * Stripe Connect Express — creator payout accounts.
 *
 * Express accounts are the standard shape for marketplaces (Airbnb/Lyft-style):
 * Stripe hosts onboarding, KYC-for-banking, the payout dashboard, and 1099s —
 * none of that gets built here. `account.updated` webhooks (see `webhooks.ts`)
 * keep `connect_accounts` in sync via `upsert_connect_account`.
 */

import { getStripe } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

export interface OnboardResult {
  url: string;
  stripeAccountId: string;
}

/**
 * Creates (or reuses) a Stripe Express account for a creator and returns a
 * fresh Account Link URL to Stripe-hosted onboarding.
 */
export async function createOrResumeOnboarding(params: {
  userId: string;
  email: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<OnboardResult> {
  const stripe = getStripe();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("connect_accounts")
    .select("stripe_account_id")
    .eq("user_id", params.userId)
    .maybeSingle();

  let stripeAccountId = existing?.stripe_account_id as string | undefined;

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: params.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: { stoa_user_id: params.userId },
    });
    stripeAccountId = account.id;

    await admin.from("connect_accounts").insert({
      user_id: params.userId,
      stripe_account_id: stripeAccountId,
      status: "pending",
    });
  }

  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    return_url: params.returnUrl,
    refresh_url: params.refreshUrl,
  });

  return { url: link.url, stripeAccountId };
}

/** Temporary Stripe-hosted login link so a creator can view their Express dashboard (payouts, balance, tax forms). */
export async function createDashboardLink(userId: string): Promise<string> {
  const stripe = getStripe();
  const admin = createAdminClient();

  const { data } = await admin
    .from("connect_accounts")
    .select("stripe_account_id")
    .eq("user_id", userId)
    .single();

  if (!data?.stripe_account_id) {
    throw new Error("No Connect account found. Complete onboarding first.");
  }

  const link = await stripe.accounts.createLoginLink(data.stripe_account_id);
  return link.url;
}

/** Reads the current Connect status for a user directly from Stripe (bypasses the local cache — useful right after onboarding redirect, before the webhook has landed). */
export async function refreshConnectStatus(userId: string) {
  const stripe = getStripe();
  const admin = createAdminClient();

  const { data } = await admin
    .from("connect_accounts")
    .select("stripe_account_id")
    .eq("user_id", userId)
    .single();
  if (!data?.stripe_account_id) return null;

  const account = await stripe.accounts.retrieve(data.stripe_account_id);
  await admin.rpc("upsert_connect_account", {
    p_user_id: userId,
    p_stripe_account_id: account.id,
    p_charges_enabled: account.charges_enabled ?? false,
    p_payouts_enabled: account.payouts_enabled ?? false,
    p_details_submitted: account.details_submitted ?? false,
    p_requirements: account.requirements?.currently_due ?? [],
  });

  return account;
}

/** Platform fee split — 10% per the product spec, computed once and reused everywhere money moves. */
export function splitPlatformFee(grossAmountCents: number) {
  const platformFeeCents = Math.round(grossAmountCents * 0.1);
  return {
    grossAmountCents,
    platformFeeCents,
    netAmountCents: grossAmountCents - platformFeeCents,
  };
}
