import "server-only";

import { getReadyClipForReport, getUnsettledClipForReport, type VideoClip } from "@/lib/db/video-clips";
import { reconcileClip } from "@/lib/video/reconcile";

/**
 * The clip to show on a publication. If nothing is live yet but an unsettled
 * clip exists, check Bunny once and retry, so a finished video appears as soon
 * as the page is opened instead of waiting for the reconcile cron.
 */
export async function getLiveClipForReport(reportId: string): Promise<VideoClip | null> {
  const clip = await getReadyClipForReport(reportId);
  if (clip) return clip;

  const unsettled = await getUnsettledClipForReport(reportId);
  if (!unsettled) return null;

  const outcome = await reconcileClip(unsettled.bunny_video_guid);
  if (outcome !== "ready") return null;

  return getReadyClipForReport(reportId);
}
