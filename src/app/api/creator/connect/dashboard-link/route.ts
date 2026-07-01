import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDashboardLink } from "@/lib/stripe/connect";
import { isStripeConfigured } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

/** Temporary Stripe-hosted login link to the creator's Express dashboard (balance, payouts, tax forms). */
export async function GET() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured on this deployment yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  try {
    const url = await createDashboardLink(user.id);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create dashboard link" },
      { status: 500 },
    );
  }
}
