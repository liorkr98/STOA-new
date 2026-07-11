import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHow } from "@/components/landing/landing-how";
import { LandingDispatchTeaser } from "@/components/landing/landing-dispatch-teaser";
import { LandingForAnalysts } from "@/components/landing/landing-for-analysts";

export const metadata: Metadata = {
  title: "Stoa - the analyst ledger",
  description:
    "Independent analysts publish price calls that lock at publish, get graded by the market, and build a public Track Score nobody can argue with.",
};

/**
 * Signed-out landing. Signed-in readers skip straight to their dispatch at
 * /home -- the personalized morning briefing built from follows and
 * subscriptions.
 */
export default async function LandingPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");

  return (
    <main>
      <LandingHero />
      <LandingHow />
      <LandingDispatchTeaser />
      <LandingForAnalysts />
    </main>
  );
}
