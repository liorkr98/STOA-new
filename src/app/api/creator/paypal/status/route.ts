import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshOnboardingStatus } from "@/lib/paypal/partner";
import { isPayPalConfigured } from "@/lib/paypal/client";

export const dynamic = "force-dynamic";

/** Polls PayPal for onboarding status right after the creator returns from the hosted flow, before the webhook lands. */
export async function GET() {
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured on this deployment yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  try {
    const merchant = await refreshOnboardingStatus(user.id);
    return NextResponse.json({ merchant });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not refresh onboarding status" },
      { status: 500 },
    );
  }
}
