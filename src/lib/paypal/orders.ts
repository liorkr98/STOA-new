/**
 * PayPal Orders API v2 — one-time payments (report unlocks) with a platform
 * fee split to the creator's onboarded merchant account. Requires the
 * platform's PayPal REST app to be approved for the `PARTNER_FEE` feature;
 * without that approval PayPal returns `PLATFORM_FEES_NOT_SUPPORTED`.
 */

import { paypalFetch } from "./client";
import { splitPlatformFee } from "./partner";

interface CreateOrderResult {
  orderId: string;
  approveUrl: string;
}

interface OrderResponse {
  id: string;
  links: { rel: string; href: string }[];
}

/** Creates an order for a report unlock, routing 90% to the creator's PayPal merchant account and 10% platform fee to the platform's own account. */
export async function createReportUnlockOrder(params: {
  creatorMerchantId: string;
  amountUsd: number;
  reportId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<CreateOrderResult> {
  const amountCents = Math.round(params.amountUsd * 100);
  const { platformFeeCents } = splitPlatformFee(amountCents);

  const response = await paypalFetch<OrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.reportId,
          custom_id: params.reportId,
          payee: { merchant_id: params.creatorMerchantId },
          amount: { currency_code: "USD", value: params.amountUsd.toFixed(2) },
          payment_instruction: {
            disbursement_mode: "INSTANT",
            platform_fees: [{ amount: { currency_code: "USD", value: (platformFeeCents / 100).toFixed(2) } }],
          },
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    },
  });

  const approveUrl = response.links.find((l) => l.rel === "approve")?.href;
  if (!approveUrl) throw new Error("PayPal did not return an approve link");

  return { orderId: response.id, approveUrl };
}

interface CaptureResponse {
  id: string;
  status: string;
  purchase_units: {
    reference_id: string;
    payments?: { captures?: { id: string; amount: { value: string; currency_code: string } }[] };
  }[];
}

/** Captures a buyer-approved order. Returns the capture id + settled amount for ledger recording. */
export async function captureOrder(orderId: string): Promise<CaptureResponse> {
  return paypalFetch<CaptureResponse>(`/v2/checkout/orders/${orderId}/capture`, { method: "POST" });
}
