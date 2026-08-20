import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { getWallet } from "@/lib/db/wallet";
import { listByAuthor } from "@/lib/db/reports";
import { listPlansForCreator } from "@/lib/db/plans";
import { BrandingStudio } from "@/components/profile/branding-studio";

export const metadata: Metadata = { title: "Storefront" };

export default async function StudioStorefrontPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const [wallet, reports, plans] = await Promise.all([
    getWallet(profile.id),
    listByAuthor(profile.id, { status: "published" }),
    listPlansForCreator(profile.id),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Storefront</h1>
        <p className="t-body mt-2">How your public profile looks and what it costs.</p>
      </div>
      <BrandingStudio
        profile={profile}
        aiCredits={wallet?.ai_credits ?? 0}
        publishedReports={reports}
        plans={plans}
      />
    </div>
  );
}
