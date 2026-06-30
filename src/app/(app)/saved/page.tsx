import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookmarkSimple } from "@phosphor-icons/react/dist/ssr";
import { ReportCard } from "@/components/report-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { getSessionUserId } from "@/lib/db/auth";
import { listSavedReports } from "@/lib/db/saved";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const reports = await listSavedReports(userId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="t-h1">Saved</h1>
        <p className="t-body mt-1">Research and calls you bookmarked for later.</p>
      </div>

      {reports.length > 0 ? (
        <div className="flex flex-col gap-5">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookmarkSimple size={32} />}
          title="No saved reports yet"
          body="Tap Save on any report to build your reading list."
          action={
            <Link href="/discover" className={buttonClass("primary", "md")}>
              Discover research
            </Link>
          }
        />
      )}
    </div>
  );
}
