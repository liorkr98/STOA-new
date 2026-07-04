import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { getWallet } from "@/lib/db/wallet";
import { listActiveBoosts } from "@/lib/db/boosts";
import { listByAuthor } from "@/lib/db/reports";
import { BrandingStudio } from "@/components/profile/branding-studio";

export const metadata: Metadata = { title: "Branding studio" };

export default async function StudioBrandingPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const [wallet, boosts, reports] = await Promise.all([
    getWallet(profile.id),
    listActiveBoosts(profile.id),
    listByAuthor(profile.id, { status: "published" }),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="t-h1">Branding studio</h1>
        <p className="t-body mt-1">
          Your public storefront — identity, layout, AI coach, and Discover boosts.
        </p>
      </div>
      <BrandingStudio
        profile={profile}
        walletBalance={wallet?.balance ?? 0}
        aiCredits={wallet?.ai_credits ?? 0}
        activeBoosts={boosts}
        publishedReports={reports}
      />
    </div>
  );
}
