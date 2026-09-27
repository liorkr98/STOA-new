import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { listByAuthor } from "@/lib/db/reports";
import { listPlansForCreator } from "@/lib/db/plans";
import { BrandingStudio } from "@/components/profile/branding-studio";

export const metadata: Metadata = { title: "Storefront" };

export default async function StudioStorefrontPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const [reports, plans] = await Promise.all([
    listByAuthor(profile.id, { status: "published" }),
    listPlansForCreator(profile.id),
  ]);

  return (
    <div className="mx-auto flex max-w-[var(--w-wide)] flex-col gap-6">
      <div>
        <h1 className="font-display text-headline font-semibold tracking-tight">Storefront</h1>
        <p className="t-body mt-2">What leads your public profile, how it looks, and what it costs.</p>
      </div>
      <BrandingStudio
        profile={profile}
        publishedReports={reports}
        plans={plans}
      />
    </div>
  );
}
