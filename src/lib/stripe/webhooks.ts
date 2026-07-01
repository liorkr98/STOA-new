/**
 * Stripe webhook event handling — verifies the signature, then dispatches to
 * the right handler. Kept separate from the route handler (`app/api/webhooks/
 * stripe/route.ts`) so the dispatch logic is testable without spinning up a
 * Next.js request.
 */

import type Stripe from "stripe";
import { getStripe } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleVerificationOutcome } from "./identity";

/** Verifies the raw webhook payload against the given secret and returns the parsed event, or throws. */
export function constructEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

/** Main Stripe webhook (Connect + payments). Handles `account.updated`, `payment_intent.succeeded`, `invoice.paid`, `customer.subscription.updated/.deleted`. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const admin = createAdminClient();

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const userId = account.metadata?.stoa_user_id;
      if (!userId) break;
      await admin.rpc("upsert_connect_account", {
        p_user_id: userId,
        p_stripe_account_id: account.id,
        p_charges_enabled: account.charges_enabled ?? false,
        p_payouts_enabled: account.payouts_enabled ?? false,
        p_details_submitted: account.details_submitted ?? false,
        p_requirements: account.requirements?.currently_due ?? [],
      });
      break;
    }

    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await recordLedgerEntry(admin, {
        sourceType: "report_purchase",
        sourceId: intent.metadata?.report_id,
        creatorId: intent.metadata?.creator_id,
        grossAmountCents: intent.amount,
        stripeTransferId: typeof intent.transfer_data?.destination === "string" ? intent.id : null,
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
      await recordLedgerEntry(admin, {
        sourceType: "subscription",
        sourceId: subscriptionId,
        creatorId: invoice.metadata?.creator_id,
        grossAmountCents: invoice.amount_paid,
        stripeTransferId: null,
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Real-money subscription lifecycle — wired once `subscriptions.stripe_subscription_id`
      // is populated by a live Stripe Checkout flow. No-op for now; the existing
      // internal-wallet subscribe_to_analyst() RPC remains the active path.
      break;

    default:
      break;
  }
}

/** Stripe Identity webhook. Handles `identity.verification_session.verified` / `.requires_input`. */
export async function handleStripeIdentityEvent(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Identity.VerificationSession;

  if (event.type === "identity.verification_session.verified") {
    await handleVerificationOutcome(session.id, "verified");
  } else if (event.type === "identity.verification_session.requires_input") {
    await handleVerificationOutcome(session.id, "failed");
  }
}

async function recordLedgerEntry(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    sourceType: "subscription" | "report_purchase";
    sourceId: string | null | undefined;
    creatorId: string | null | undefined;
    grossAmountCents: number;
    stripeTransferId: string | null;
  },
) {
  if (!params.creatorId || !params.sourceId) return;
  const platformFeeCents = Math.round(params.grossAmountCents * 0.1);

  await admin.from("platform_transfers").insert({
    creator_id: params.creatorId,
    source_type: params.sourceType,
    source_id: params.sourceId,
    gross_amount_cents: params.grossAmountCents,
    platform_fee_cents: platformFeeCents,
    net_amount_cents: params.grossAmountCents - platformFeeCents,
    stripe_transfer_id: params.stripeTransferId,
  });
}
