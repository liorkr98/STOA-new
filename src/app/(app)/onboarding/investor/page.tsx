import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/db/auth";
import { SectorPicker } from "@/components/onboarding/sector-picker";

export const metadata: Metadata = { title: "What are you interested in?" };

const SECTORS = ["Semiconductors", "Software", "Internet", "Hardware", "Consumer", "Financials", "Energy", "Autos"];

export default async function InvestorOnboardingPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[var(--w-reading)] flex-col justify-center gap-8">
      <div>
        <h1 className="t-h1">What are you interested in?</h1>
        <p className="t-body mt-2">
          We will use this to shape your feed. You can change it anytime.
        </p>
      </div>
      <SectorPicker sectors={SECTORS} initial={profile.profile_config?.interests ?? []} />
    </div>
  );
}
