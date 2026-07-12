import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";
import { getSessionUserId } from "@/lib/db/auth";
import { buildDispatch } from "@/lib/dispatch/build-dispatch";

export const metadata: Metadata = {
  title: "Stoa — Think clearly. Invest better.",
  description:
    "Verified research marketplace. Locked price targets, AI fact-checks, and Track Scores you can trust.",
};

export default async function MarketingHomePage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");

  const dispatch = await buildDispatch(false);
  return <LandingPage dispatch={dispatch} />;
}
