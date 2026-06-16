import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/db/auth";
import { ComposeEditor } from "@/components/studio/compose-editor";

export const metadata: Metadata = { title: "Compose" };

export default async function ComposePage() {
  const profile = (await getSessionProfile())!;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="t-h1">Compose</h1>
      <ComposeEditor analystReportPrice={profile.report_price} />
    </div>
  );
}
