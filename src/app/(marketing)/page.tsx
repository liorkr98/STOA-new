import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { listRecentResolved } from "@/lib/db/predictions";
import { buildDispatch } from "@/lib/dispatch/build-dispatch";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingLedgerProof } from "@/components/landing/landing-ledger-proof";
import { LandingHow } from "@/components/landing/landing-how";
import { LandingDispatchTeaser } from "@/components/landing/landing-dispatch-teaser";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingForAnalysts } from "@/components/landing/landing-for-analysts";
import type { DispatchPayload } from "@/lib/dispatch/types";

export const metadata: Metadata = {
  title: "Stoa - the analyst ledger",
  description:
    "Independent analysts publish price calls that lock at publish and get graded by the market. Every outcome stays visible, hits and misses both.",
};

/**
 * Signed-out landing, built from the live ledger: real graded calls in the
 * hero and proof strip, today's actual issue in the dispatch teaser. Signed-in
 * readers skip straight to their own dispatch at /home.
 */
export default async function LandingPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");

  let calls: Awaited<ReturnType<typeof listRecentResolved>> = [];
  let dispatch: DispatchPayload | null = null;
  try {
    [calls, dispatch] = await Promise.all([listRecentResolved(16), buildDispatch(false)]);
  } catch {
    // The landing renders fully without data; sections with nothing to show collapse.
  }

  return (
    <main>
      <LandingHero calls={calls} />
      <LandingLedgerProof calls={calls.slice(3)} />
      <LandingHow />
      <LandingDispatchTeaser dispatch={dispatch} />
      <LandingFaq />
      <LandingForAnalysts />
    </main>
  );
}
