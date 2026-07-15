import { NextResponse } from "next/server";
import { verifyWebhookSignature, handlePayPalEvent, type PayPalEvent } from "@/lib/paypal/webhooks";
import { alertPaypalWebhookError } from "@/lib/slack/alerts";

export const dynamic = "force-dynamic";

/** PayPal webhook: MERCHANT.ONBOARDING.COMPLETED, PAYMENT.CAPTURE.COMPLETED, BILLING.SUBSCRIPTION.*. */
export async function POST(request: Request) {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");
  const transmissionSig = request.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return NextResponse.json({ error: "Missing PayPal transmission headers" }, { status: 400 });
  }

  const event = (await request.json()) as PayPalEvent;

  const verified = await verifyWebhookSignature(
    { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig },
    event,
  );
  if (!verified) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    await handlePayPalEvent(event);
    return NextResponse.json({ received: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Handler failed";
    console.error("paypal webhook handler failed", event.event_type, e);

    await alertPaypalWebhookError({
      eventType: event.event_type,
      eventId: event.id,
      error: message,
    });

    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
