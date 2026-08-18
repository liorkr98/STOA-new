import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { BrandStep } from "@/components/onboarding/brand-step";

export const metadata: Metadata = { title: "Brand your profile" };

export default async function AnalystBrandPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  return (
    <div>
      <div className="text-center">
        <h1 className="t-h1">Brand your profile</h1>
        <p className="t-body mt-2">This is what investors see before they follow or subscribe.</p>
      </div>
      <BrandStep profile={profile} />
    </div>
  );
}
