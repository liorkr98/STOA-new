import { NextResponse } from "next/server";
import { constructEvent, handleStripeIdentityEvent } from "@/lib/stripe/webhooks";

export const dynamic = "force-dynamic";

/** Stripe Identity webhook: identity.verification_session.verified / .requires_input. Separate signing secret from the main Stripe webhook. */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;
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
    await handleStripeIdentityEvent(event);
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("stripe identity webhook handler failed", event.type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
