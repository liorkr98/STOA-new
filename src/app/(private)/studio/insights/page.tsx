import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { listByAuthor } from "@/lib/db/reports";
import { listClipsByCreator } from "@/lib/db/video-clips";
import { InsightsView, type InsightClip, type InsightTotals } from "@/components/studio/insights-view";

export const metadata: Metadata = { title: "Insights" };

export default async function StudioInsightsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const [reports, clips] = await Promise.all([
    listByAuthor(profile.id, { limit: 100 }),
    listClipsByCreator(profile.id),
  ]);

  const reportById = new Map(reports.map((r) => [r.id, r]));
  const rows: InsightClip[] = clips.map((c) => {
    const report = reportById.get(c.report_id);
    return {
      id: c.id,
      reportId: c.report_id,
      href: `/report/${c.report_id}`,
      title: report?.title?.trim() || report?.summary?.trim() || "Untitled",
      status: c.status,
      published: Boolean(c.published_at) && report?.status === "published",
      plays: c.play_count ?? 0,
      completions: c.completion_count ?? 0,
      clickThroughs: c.click_through_count ?? 0,
      pageViews: report?.views ?? 0,
    };
  });

  const totals: InsightTotals = {
    plays: rows.reduce((n, r) => n + r.plays, 0),
    completions: rows.reduce((n, r) => n + r.completions, 0),
    clickThroughs: rows.reduce((n, r) => n + r.clickThroughs, 0),
    pageViews: reports.reduce((n, r) => n + (r.views ?? 0), 0),
  };

  return <InsightsView rows={rows} totals={totals} />;
}
