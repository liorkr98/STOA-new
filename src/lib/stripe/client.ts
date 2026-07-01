import Stripe from "stripe";

let cached: Stripe | null = null;

/** Lazily constructs the Stripe client. Throws only when actually called without a key, so the app still boots/builds without Stripe configured. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local to enable Connect payouts / Identity verification.",
    );
  }
  if (!cached) {
    cached = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  }
  return cached;
}

/** Cheap check for gating UI/route behavior without throwing. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
