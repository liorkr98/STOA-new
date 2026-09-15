import "server-only";

import * as Sentry from "@sentry/nextjs";
import { getReadyClipForReport, getUnsettledClipForReport, type VideoClip } from "@/lib/db/video-clips";
import { reconcileClip } from "@/lib/video/reconcile";

/**
 * The clip to show on a publication. If nothing is live yet but an unsettled
 * clip exists, check Bunny once and retry, so a finished video appears as soon
 * as the page is opened instead of waiting for the reconcile cron.
 *
 * Failures stay on the clip, not the page: a throw here is a Server Component
 * crash, which production React reports as minified error #441 with the real
 * message stripped. Caption/transcript work is not run inline on this path.
 */
export async function getLiveClipForReport(reportId: string): Promise<VideoClip | null> {
  try {
    const clip = await getReadyClipForReport(reportId);
    if (clip) return clip;

    const unsettled = await getUnsettledClipForReport(reportId);
    if (!unsettled) return null;

    const outcome = await reconcileClip(unsettled.bunny_video_guid, { process: false });
    if (outcome !== "ready") return null;

    return getReadyClipForReport(reportId);
  } catch (err) {
    Sentry.captureException(err, { extra: { reportId, where: "getLiveClipForReport" } });
    return null;
  }
}
