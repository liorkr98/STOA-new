import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { getDraftForAuthor } from "@/lib/db/reports";
import { StudioEditor } from "@/components/editor/studio-editor";

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
    <div className="-mx-5 max-w-none md:-mx-8">
      <StudioEditor analystReportPrice={profile.report_price} initialDraft={draft} />
    </div>
  );
}
