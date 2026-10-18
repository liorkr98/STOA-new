import "server-only";

import { NextResponse } from "next/server";
import { gatedSiteOn } from "@/lib/flags/gated-site";
import { getVerifiedUserId } from "@/lib/db/auth";

/**
 * The signed-out wall's check for API routes and server actions, which the
 * middleware does not gate (an action can be posted to any page's address,
 * the landing page's included). With FEATURE_GATED_SITE off it always allows.
 */
export async function wallAllows(): Promise<boolean> {
  if (!gatedSiteOn()) return true;
  return Boolean(await getVerifiedUserId());
}

/** For a route handler: a 401 to return, or null to carry on. */
export async function wallRefusal(): Promise<NextResponse | null> {
  if (await wallAllows()) return null;
  return NextResponse.json(
    { error: "Sign in to use Stoa." },
    { status: 401, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } },
  );
}
