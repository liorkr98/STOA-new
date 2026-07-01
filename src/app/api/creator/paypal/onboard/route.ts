import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOnboardingLink } from "@/lib/paypal/partner";
import { isPayPalConfigured } from "@/lib/paypal/client";

export const dynamic = "force-dynamic";

/** Creates (or resumes) a creator's PayPal partner referral and returns the onboarding URL to redirect to. */
export async function POST(request: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured on this deployment yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;

  try {
    const result = await createOnboardingLink({
      userId: user.id,
      email: user.email,
      returnUrl: `${origin}/settings/payouts?onboarding=complete`,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start onboarding" },
      { status: 500 },
    );
  }
}
