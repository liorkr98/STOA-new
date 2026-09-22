import "server-only";

import { getReport } from "@/lib/db/reports";
import { getPendingClipForReport, getUnsettledClipForReport } from "@/lib/db/video-clips";
import { getLiveClipForReport } from "@/lib/video/clip-for-report";
import { getBunnyVideo } from "@/lib/video/bunny";

export type PublicClipStatus = "ready" | "processing" | "failed" | "none";

export interface ClipStatusPayload {
  status: PublicClipStatus;
  /** 0-100 while Bunny is encoding; null when not applicable. */
  encodeProgress: number | null;
}

/**
 * What the report page (and its poller) should show for a publication's clip.
 * Reconciles with Bunny first. A failed clip is only reported to its author.
 */
export async function getPublicClipStatus(
  reportId: string,
  viewerId: string | null,
): Promise<ClipStatusPayload> {
  const live = await getLiveClipForReport(reportId);
  if (live) return { status: "ready", encodeProgress: 100 };

  const pending = await getPendingClipForReport(reportId);
  if (!pending) return { status: "none", encodeProgress: null };
  if (pending.status === "failed") {
    if (!viewerId) return { status: "none", encodeProgress: null };
    const report = await getReport(reportId);
    if (report?.author_id === viewerId) return { status: "failed", encodeProgress: null };
    return { status: "none", encodeProgress: null };
  }

  let encodeProgress: number | null = null;
  try {
    const unsettled = await getUnsettledClipForReport(reportId);
    if (unsettled) {
      const video = await getBunnyVideo(unsettled.bunny_video_guid);
      const n = video.encodeProgress;
      if (typeof n === "number" && n >= 0) encodeProgress = Math.min(100, Math.round(n));
    }
  } catch {
    // Progress is optional; the page still says the clip is on the way.
  }

  return { status: "processing", encodeProgress };
}
