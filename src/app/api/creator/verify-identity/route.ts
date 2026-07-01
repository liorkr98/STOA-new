import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createVerificationSession } from "@/lib/stripe/identity";
import { isStripeConfigured } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

/** Creates a Stripe Identity VerificationSession and returns the client secret for the embedded modal. */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Identity verification is not configured on this deployment yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  try {
    const result = await createVerificationSession(user.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start verification" },
      { status: 500 },
    );
  }
}
