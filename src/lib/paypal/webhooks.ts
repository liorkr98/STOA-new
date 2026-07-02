/**
 * PayPal webhook verification + dispatch.
 *
 * Unlike Stripe (local HMAC verification), PayPal verifies webhooks by
 * posting the transmission headers + raw event back to its own
 * verify-webhook-signature endpoint. Kept separate from the route handler
 * (`app/api/webhooks/paypal/route.ts`) so dispatch logic is testable without
 * spinning up a Next.js request.
 */

import { paypalFetch } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PayPalHeaders {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
}

export interface PayPalEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
}

interface VerifyResponse {
  verification_status: "SUCCESS" | "FAILURE";
}

/** Verifies a webhook's authenticity via PayPal's own verify-webhook-signature endpoint. */
export async function verifyWebhookSignature(headers: PayPalHeaders, event: PayPalEvent): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const result = await paypalFetch<VerifyResponse>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      transmission_id: headers.transmissionId,
      transmission_time: headers.transmissionTime,
      cert_url: headers.certUrl,
      auth_algo: headers.authAlgo,
      transmission_sig: headers.transmissionSig,
      webhook_id: webhookId,
      webhook_event: event,
    },
  });

  return result.verification_status === "SUCCESS";
}

/** Returns true when this event was already processed (idempotent no-op). */
export async function claimWebhookEvent(provider: string, eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("processed_webhook_events").insert({ provider, event_id: eventId });
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

/** Dispatches a verified PayPal webhook event. Handles onboarding completion, order captures, and subscription lifecycle. */
export async function handlePayPalEvent(event: PayPalEvent): Promise<void> {
  if (!(await claimWebhookEvent("paypal", event.id))) return;

  const admin = createAdminClient();

  switch (event.event_type) {
    case "MERCHANT.ONBOARDING.COMPLETED": {
      const resource = event.resource as {
        merchant_id?: string;
        tracking_id?: string;
        payments_receivable?: boolean;
        primary_email_confirmed?: boolean;
      };
      if (!resource.tracking_id) break;

      const { data: account } = await admin
        .from("paypal_accounts")
        .select("user_id")
        .eq("tracking_id", resource.tracking_id)
        .single();
      if (!account) break;

      await admin.rpc("upsert_paypal_account", {
        p_user_id: account.user_id,
        p_tracking_id: resource.tracking_id,
        p_paypal_merchant_id: resource.merchant_id ?? null,
        p_payments_receivable: resource.payments_receivable ?? false,
        p_primary_email_confirmed: resource.primary_email_confirmed ?? false,
      });
      break;
    }

    case "PAYMENT.CAPTURE.COMPLETED": {
      const resource = event.resource as {
        id: string;
        custom_id?: string;
        amount?: { value: string; currency_code: string };
        seller_receivable_breakdown?: { platform_fees?: { amount: { value: string } }[] };
      };
      const reportId = resource.custom_id;
      if (!reportId || !resource.amount) break;

      const grossAmountCents = Math.round(Number.parseFloat(resource.amount.value) * 100);
      const platformFeeCents = Math.round(
        Number.parseFloat(resource.seller_receivable_breakdown?.platform_fees?.[0]?.amount.value ?? "0") * 100,
      );

      const { data: report } = await admin.from("reports").select("author_id").eq("id", reportId).single();
      if (!report) break;

      await admin.from("platform_transfers").insert({
        creator_id: report.author_id,
        source_type: "report_purchase",
        source_id: reportId,
        gross_amount_cents: grossAmountCents,
        platform_fee_cents: platformFeeCents,
        net_amount_cents: grossAmountCents - platformFeeCents,
        provider: "paypal",
        provider_transfer_id: resource.id,
      });
      break;
    }

    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.CANCELLED":
      // Real-money subscription lifecycle — wired once `subscriptions.paypal_subscription_id`
      // is populated by a live PayPal Subscriptions checkout flow. No-op for now; the
      // existing internal-wallet subscribe_to_analyst() RPC remains the active path.
      break;

    default:
      break;
  }
}
