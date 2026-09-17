import "server-only";

import { getReport } from "@/lib/db/reports";
import { getPendingClipForReport } from "@/lib/db/video-clips";
import { getLiveClipForReport } from "@/lib/video/clip-for-report";

export type PublicClipStatus = "ready" | "processing" | "failed" | "none";

/**
 * What the report page (and its poller) should show for a publication's clip.
 * Reconciles with Bunny first. A failed clip is only reported to its author.
 */
export async function getPublicClipStatus(
  reportId: string,
  viewerId: string | null,
): Promise<PublicClipStatus> {
  const live = await getLiveClipForReport(reportId);
  if (live) return "ready";

  const pending = await getPendingClipForReport(reportId);
  if (!pending) return "none";
  if (pending.status !== "failed") return "processing";
  if (!viewerId) return "none";

  const report = await getReport(reportId);
  if (report?.author_id === viewerId) return "failed";
  return "none";
}
