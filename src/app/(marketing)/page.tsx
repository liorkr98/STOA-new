import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUserId } from "@/lib/db/auth";
import { buildLanding } from "@/lib/landing/build-landing";
import { LandingPage } from "@/components/landing/landing-page";
import { MarketTapeFallback, MarketTapeSlot } from "@/components/markets/market-tape-slot";

export const metadata: Metadata = {
  title: "Stoa - Think clearly. Invest better.",
  description:
    "Independent analysts publish their research on video. Every call locks at publish and is graded by the market, hits and misses alike.",
};

/**
 * The signed-out root: the doors, a glimpse of Today (headlines only), the
 * most popular verdicts beside the most popular creators, and the footer.
 * Built from real rows; a section with nothing to show collapses. Signed-in
 * readers go straight to Today.
 */
export default async function RootPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");
  const data = await buildLanding();
  return (
    <LandingPage
      data={data}
      tape={
        <Suspense fallback={<MarketTapeFallback />}>
          <MarketTapeSlot />
        </Suspense>
      }
    />
  );
}
