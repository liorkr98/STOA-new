import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import {
  getAuthorReportStatus,
  getDraftForAuthor,
  getPublishedForAuthor,
  lastVerdictPublishedAt,
  listDraftsForPicker,
} from "@/lib/db/reports";
import { listActivePlans } from "@/lib/db/plans";
import { getWallet } from "@/lib/db/wallet";
import { listAuthorCards } from "@/lib/db/publication-cards";
import { listVideosByReport } from "@/lib/db/video-clips";
import { listEntries, listNotebooks } from "@/lib/db/notebooks";
import { notebookToDoc } from "@/lib/editor/notebook-seed";
import { StudioEditor } from "@/components/editor/studio-editor";
import { VersionHistory } from "@/components/editor/version-history";
import { FirstReportBanner } from "@/components/onboarding/first-report-banner";
import { ComposePicker, type PickerDraft } from "@/components/compose/type-picker";
import { summarizeDraft } from "@/lib/compose/drafts";
import { isPublicationType } from "@/lib/compose/modes";
import { verdictWindow } from "@/lib/compose/verdict";
import type { Report } from "@/lib/types";

export const metadata: Metadata = { title: "Compose" };

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; type?: string; onboarding?: string; notebook?: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  const { id, type: rawType, onboarding, notebook } = await searchParams;

  // Compose opens by asking what the analyst is publishing. A draft, a chosen
  // type or a notebook to seed from skips the question.
  if (!id && !notebook && !isPublicationType(rawType)) {
    const [rows, lastVerdict] = await Promise.all([
      listDraftsForPicker(profile.id),
      lastVerdictPublishedAt(profile.id),
    ]);
    const drafts: PickerDraft[] = rows.map((row) => {
      const d = summarizeDraft(row);
      return { ...d, editedLabel: formatDistanceToNowStrict(new Date(d.touchedAt), { addSuffix: true }) };
    });
    return (
      <div className="breakout-main">
        <ComposePicker drafts={drafts} verdictWindow={verdictWindow(lastVerdict)} />
      </div>
    );
  }

  const [draft, wallet, plans, savedCards, clips, lastVerdict] = await Promise.all([
    id ? getDraftForAuthor(id, profile.id) : Promise.resolve(null),
    getWallet(profile.id),
    listActivePlans(profile.id),
    id ? listAuthorCards(id, profile.id) : Promise.resolve([]),
    id ? listVideosByReport(id) : Promise.resolve([]),
    lastVerdictPublishedAt(profile.id),
  ]);
  // A published report used to be a dead end here, because the database
  // refused every edit. Editing is allowed now and disclosed when it happens,
  // so the author lands in the editor rather than being bounced to the report.
  let published: Report | null = null;
  if (id && !draft) {
    const status = await getAuthorReportStatus(id, profile.id);
    if (!status) notFound();
    published = await getPublishedForAuthor(id, profile.id);
    if (!published) redirect(`/report/${id}`);
  }

  // The stored row id becomes the client id, so a placement made before this
  // save still points at the same card after it.
  const initialCards = savedCards.map((c) => ({
    id: c.id,
    kind: c.kind,
    locked: c.locked,
    payload: c.payload,
  }));

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
        initialType={isPublicationType(rawType) ? rawType : "thesis"}
        initialDraft={draft ?? published ?? seeded}
        editingPublished={Boolean(published)}
        hasLockedCall={Boolean(published?.prediction)}
        verdictLastPublishedAt={lastVerdict}
        initialCards={initialCards}
        hasVideoClip={clips.length > 0}
        aiCredits={wallet?.ai_credits ?? 0}
        plans={plans}
      />
      {draft?.id && <VersionHistory reportId={draft.id} />}
    </div>
  );
}
