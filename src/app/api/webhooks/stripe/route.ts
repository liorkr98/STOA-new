import { NextResponse } from "next/server";
import { constructEvent, handleStripeEvent } from "@/lib/stripe/webhooks";

export const dynamic = "force-dynamic";

/** Main Stripe webhook: account.updated, payment_intent.succeeded, invoice.paid, customer.subscription.*. */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const payload = await request.text();

  let event;
  try {
    event = constructEvent(payload, signature, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid signature: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 400 },
    );
  }

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (e) {
    // Stripe retries on non-2xx, so log and 500 rather than swallowing failures.
    console.error("stripe webhook handler failed", event.type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
