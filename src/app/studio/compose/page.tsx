import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { getDraftForAuthor } from "@/lib/db/reports";
import { ComposeEditor } from "@/components/studio/compose-editor";

export const metadata: Metadata = { title: "Compose" };

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const profile = (await getSessionProfile())!;
  const { id } = await searchParams;

  const draft = id ? await getDraftForAuthor(id, profile.id) : null;
  if (id && !draft) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="t-h1">{draft ? "Edit draft" : "Compose"}</h1>
      <ComposeEditor analystReportPrice={profile.report_price} initialDraft={draft} />
    </div>
  );
}
