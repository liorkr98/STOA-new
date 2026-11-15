import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUserId } from "@/lib/db/auth";
import { buildLanding } from "@/lib/landing/build-landing";
import { LandingPage } from "@/components/landing/landing-page";
import { MarketTapeFallback, MarketTapeSlot } from "@/components/markets/market-tape-slot";
import { interestCartOpenTo } from "@/lib/flags/interest-cart";
import { isInviteOnly } from "@/lib/access/gate";
import { ClosedPreview } from "@/components/access/closed-preview";

export const metadata: Metadata = {
  title: "Stoa - Think clearly. Invest better.",
  description:
    "Independent analysts publish their research on video.",
  ...(isInviteOnly() ? { robots: { index: false, follow: false } } : {}),
};

/**
 * The signed-out root: the doors, a glimpse of Today (headlines only), the
 * most popular creators, and the footer.
 * Built from real rows; a section with nothing to show collapses. Signed-in
 * readers go straight to Today. During invite-only preview the public doors
 * stay shut: existing accounts sign in, new people arrive with a link.
 */
export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");
  if (isInviteOnly()) {
    const { invite } = await searchParams;
    return <ClosedPreview invalidInvite={invite === "invalid"} />;
  }
  const data = await buildLanding();
  return (
    <LandingPage
      data={data}
      cartOn={interestCartOpenTo(null)}
      tape={
        <Suspense fallback={<MarketTapeFallback />}>
          <MarketTapeSlot />
        </Suspense>
      }
    />
  );
}
