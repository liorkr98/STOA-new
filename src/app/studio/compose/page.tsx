import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { getDraftForAuthor } from "@/lib/db/reports";
import { getWallet } from "@/lib/db/wallet";
import { StudioEditor } from "@/components/editor/studio-editor";
import { FirstReportBanner } from "@/components/onboarding/first-report-banner";

export const metadata: Metadata = { title: "Compose" };

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; onboarding?: string }>;
}) {
  const profile = (await getSessionProfile())!;
  const { id, onboarding } = await searchParams;
  const [draft, wallet] = await Promise.all([
    id ? getDraftForAuthor(id, profile.id) : Promise.resolve(null),
    getWallet(profile.id),
  ]);
  if (id && !draft) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      {onboarding === "1" && <FirstReportBanner />}
      <StudioEditor
        analystReportPrice={profile.report_price}
        initialDraft={draft}
        aiCredits={wallet?.ai_credits ?? 0}
      />
    </div>
  );
}
