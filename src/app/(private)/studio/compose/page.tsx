import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { getDraftForAuthor } from "@/lib/db/reports";
import { listActivePlans } from "@/lib/db/plans";
import { getWallet } from "@/lib/db/wallet";
import { listEntries, listNotebooks } from "@/lib/db/notebooks";
import { notebookToDoc } from "@/lib/editor/notebook-seed";
import { StudioEditor } from "@/components/editor/studio-editor";
import { VersionHistory } from "@/components/editor/version-history";
import { FirstReportBanner } from "@/components/onboarding/first-report-banner";
import type { Report } from "@/lib/types";

export const metadata: Metadata = { title: "Compose" };

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; onboarding?: string; notebook?: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  const { id, onboarding, notebook } = await searchParams;
  const [draft, wallet, plans] = await Promise.all([
    id ? getDraftForAuthor(id, profile.id) : Promise.resolve(null),
    getWallet(profile.id),
    listActivePlans(profile.id),
  ]);
  if (id && !draft) notFound();

  // Compose-from-notebook (Part F): with ?notebook= and no existing draft,
  // seed the editor from the notebook's entries (snippets as cited
  // blockquotes, figures/charts as real blocks). RLS scopes entries to the
  // owner, so a foreign notebook id simply seeds nothing.
  let seeded: Report | null = null;
  if (!draft && notebook) {
    const [notebooks, entries] = await Promise.all([listNotebooks(), listEntries(notebook)]);
    const nb = notebooks.find((n) => n.id === notebook);
    if (nb && entries.length > 0) {
      seeded = {
        body: JSON.stringify(notebookToDoc(nb.title, entries)),
      } as unknown as Report;
    }
  }

  return (
    <div className="breakout-main">
      {onboarding === "1" && (
        <div className="mx-auto max-w-[var(--w-reading)] px-4 pt-6">
          <FirstReportBanner />
        </div>
      )}
      <StudioEditor
        analystReportPrice={profile.report_price}
        initialDraft={draft ?? seeded}
        aiCredits={wallet?.ai_credits ?? 0}
        plans={plans}
      />
      {draft?.id && <VersionHistory reportId={draft.id} />}
    </div>
  );
}
