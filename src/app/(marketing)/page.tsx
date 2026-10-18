import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUserId } from "@/lib/db/auth";
import { buildLanding } from "@/lib/landing/build-landing";
import { LandingPage } from "@/components/landing/landing-page";
import { MarketTapeFallback, MarketTapeSlot } from "@/components/markets/market-tape-slot";
import { interestCartOpenTo } from "@/lib/flags/interest-cart";
import { gatedSiteOn } from "@/lib/flags/gated-site";

export const metadata: Metadata = {
  title: "Stoa - Think clearly. Invest better.",
  description:
    "Independent analysts publish their research on video.",
};

/**
 * The signed-out root: the doors, a glimpse of Today (headlines only), the
 * most popular creators, and the footer.
 * Built from real rows; a section with nothing to show collapses. Signed-in
 * readers go straight to Today.
 */
export default async function RootPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");
  const built = await buildLanding();
  const gated = gatedSiteOn();
  // Behind the signed-out wall nothing plays for a visitor: the lead keeps its
  // poster and loses its playback and embed links, so none reach the page.
  const data = gated && built.lead ? { ...built, lead: { ...built.lead, playbackUrl: null, embedUrl: null } } : built;
  return (
    <LandingPage
      data={data}
      gated={gated}
      cartOn={interestCartOpenTo(null)}
      tape={
        <Suspense fallback={<MarketTapeFallback />}>
          <MarketTapeSlot />
        </Suspense>
      }
    />
  );
}
