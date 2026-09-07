import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { getBunnyVideo, isBunnyConfigured } from "@/lib/video/bunny";
import { listUnsettledClips } from "@/lib/db/video-clips";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Why is nothing going live?
 *
 * There are three different faults with the same symptom, and no way to tell
 * them apart from the outside:
 *
 *   1. Bunny is not transcoding (plan limit, encoding quota, suspended account).
 *      Clips sit at status 1-3 forever and `stalledOldestHours` climbs.
 *   2. We cannot reach Bunny (missing or rotated API key, wrong library id).
 *      Every clip reports `unreachable`, which looks identical to a stall from
 *      the app side but is our fault, not theirs.
 *   3. Bunny finished and we never heard (webhook not arriving). Bunny reports
 *      status 4 while our row is still `processing`, and `promotable` counts it.
 *
 * Read-only: this reports, it does not reconcile, so it is safe to hit while
 * debugging. Use /api/cron/video-reconcile to actually promote.
 *
 * Auth: same CRON_SECRET bearer token as the cron routes.
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/admin/video-health
 */

/** Bunny's own status codes, spelled out so the output needs no lookup table. */
const BUNNY_STATUS: Record<number, string> = {
  0: "created",
  1: "uploaded",
  2: "processing",
  3: "transcoding",
  4: "finished",
  5: "error",
  6: "uploadFailed",
};

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isBunnyConfigured()) {
    return NextResponse.json({
      bunnyConfigured: false,
      diagnosis: "Bunny env is missing on this deployment, so no clip can ever settle.",
    });
  }

  const clips = await listUnsettledClips(50);
  const now = Date.now();

  const rows = await Promise.all(
    clips.map(async (clip) => {
      try {
        const video = await getBunnyVideo(clip.bunny_video_guid);
        return {
          guid: clip.bunny_video_guid,
          ourStatus: clip.status,
          publishedAt: clip.published_at,
          bunnyStatus: BUNNY_STATUS[video.status] ?? `unknown(${video.status})`,
          bunnyStatusCode: video.status,
          durationSeconds: video.length,
          reachable: true as const,
        };
      } catch (e) {
        return {
          guid: clip.bunny_video_guid,
          ourStatus: clip.status,
          publishedAt: clip.published_at,
          reachable: false as const,
          error: e instanceof Error ? e.message.slice(0, 200) : "unknown",
        };
      }
    }),
  );

  const unreachable = rows.filter((r) => !r.reachable);
  const encoding = rows.filter((r) => r.reachable && r.bunnyStatusCode !== undefined && r.bunnyStatusCode < 4);
  const promotable = rows.filter((r) => r.reachable && r.bunnyStatusCode === 4);
  const errored = rows.filter(
    (r) => r.reachable && (r.bunnyStatusCode === 5 || r.bunnyStatusCode === 6),
  );

  const oldest = clips.length > 0 ? clips[clips.length - 1] : null;
  const stalledOldestHours = oldest?.published_at
    ? Math.round((now - Date.parse(oldest.published_at)) / 3_600_000)
    : null;

  let diagnosis: string;
  if (rows.length === 0) {
    diagnosis = "Nothing unsettled. Every clip has either gone live or failed.";
  } else if (unreachable.length === rows.length) {
    diagnosis =
      "Every clip is unreachable, so this is our side: check BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID on this deployment.";
  } else if (promotable.length > 0) {
    diagnosis = `${promotable.length} clip(s) finished at Bunny but are still unpromoted here, which means webhook deliveries are not arriving. Run /api/cron/video-reconcile to promote them now.`;
  } else if (encoding.length > 0) {
    diagnosis = `${encoding.length} clip(s) are still pre-finished at Bunny. If this does not move, the encoding queue is stalled on their side: check the plan's encoding allowance and the account's billing state.`;
  } else {
    diagnosis = `${errored.length} clip(s) failed at Bunny.`;
  }

  return NextResponse.json({
    bunnyConfigured: true,
    checkedAt: new Date(now).toISOString(),
    counts: {
      unsettled: rows.length,
      stillEncodingAtBunny: encoding.length,
      finishedButUnpromoted: promotable.length,
      failedAtBunny: errored.length,
      unreachable: unreachable.length,
    },
    stalledOldestHours,
    diagnosis,
    clips: rows,
  });
}
