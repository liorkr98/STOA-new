/**
 * PayPal Partner Referrals — creator payout onboarding.
 *
 * This is PayPal's analog to Stripe Connect Express: a hosted onboarding flow
 * where the seller signs up for (or logs into) their own PayPal account and
 * grants the platform permission to receive payments and platform fees on
 * their behalf. PayPal performs its own KYC during this flow — there's no
 * separate "Identity" product to integrate for creator verification.
 *
 * Requires the platform's PayPal REST app to be approved for partner/platform
 * fees (`PARTNER_FEE` feature) to actually split payments later; onboarding
 * itself works in sandbox without that approval.
 */

import { nanoid } from "nanoid";
import { paypalFetch } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

export interface OnboardResult {
  actionUrl: string;
  trackingId: string;
}

interface PartnerReferralResponse {
  links: { rel: string; href: string; method: string }[];
}

/** Creates a Partner Referral and returns the hosted onboarding URL to redirect the creator to. */
export async function createOnboardingLink(params: {
  userId: string;
  email: string;
  returnUrl: string;
}): Promise<OnboardResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("paypal_accounts")
    .select("tracking_id, status")
    .eq("user_id", params.userId)
    .maybeSingle();

  const trackingId = existing?.tracking_id ?? `stoa_${params.userId.slice(0, 8)}_${nanoid(8)}`;

  const response = await paypalFetch<PartnerReferralResponse>("/v2/customer/partner-referrals", {
    method: "POST",
    body: {
      tracking_id: trackingId,
      partner_config_override: { return_url: params.returnUrl },
      operations: [
        {
          operation: "API_INTEGRATION",
          api_integration_preference: {
            rest_api_integration: {
              integration_method: "PAYPAL",
              integration_type: "THIRD_PARTY",
              third_party_details: {
                features: ["PAYMENT", "REFUND", "PARTNER_FEE"],
              },
            },
          },
        },
      ],
      products: ["PPCP"],
      legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
    },
  });

  const actionUrl = response.links.find((l) => l.rel === "action_url")?.href;
  if (!actionUrl) throw new Error("PayPal did not return an onboarding action_url");

  if (!existing) {
    await admin.from("paypal_accounts").insert({
      user_id: params.userId,
      tracking_id: trackingId,
      status: "pending",
    });
  }

  return { actionUrl, trackingId };
}

interface MerchantIntegrationResponse {
  merchant_id: string;
  payments_receivable: boolean;
  primary_email_confirmed: boolean;
  tracking_id?: string;
}

/**
 * Polls PayPal for onboarding status by tracking_id (works even before we
 * know the PayPal-assigned merchant_id) and syncs `paypal_accounts`. Useful
 * right after the creator returns from onboarding, before the webhook lands.
 */
export async function refreshOnboardingStatus(userId: string) {
  const admin = createAdminClient();
  const partnerId = process.env.PAYPAL_PARTNER_ID;
  if (!partnerId) throw new Error("PAYPAL_PARTNER_ID is not set");

  const { data } = await admin
    .from("paypal_accounts")
    .select("tracking_id")
    .eq("user_id", userId)
    .single();
  if (!data?.tracking_id) return null;

  const merchant = await paypalFetch<MerchantIntegrationResponse>(
    `/v1/customer/partners/${partnerId}/merchant-integrations?tracking_id=${encodeURIComponent(data.tracking_id)}`,
  );

  await admin.rpc("upsert_paypal_account", {
    p_user_id: userId,
    p_tracking_id: data.tracking_id,
    p_paypal_merchant_id: merchant.merchant_id ?? null,
    p_payments_receivable: merchant.payments_receivable ?? false,
    p_primary_email_confirmed: merchant.primary_email_confirmed ?? false,
  });

  return merchant;
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
