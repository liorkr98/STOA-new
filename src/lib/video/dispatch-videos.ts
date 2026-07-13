import "server-only";
import { listVideoClipCards } from "@/lib/db/video-clips";
import { toVideoCardData } from "@/lib/video/card";
import { isVideoFirstDiscover } from "@/lib/db/feature-flags";
import type { VideoCardData } from "@/lib/video/card-data";

/**
 * Video payload for the Dispatch (Part 5). Lead = the single most important
 * clip (earns an actually-playing preview); secondary = the rest, rendered with
 * the same Part 4 card component. Returns disabled when the flag is off so the
 * Dispatch renders its text-first structure unchanged.
 */
export async function getDispatchVideos(): Promise<{
  enabled: boolean;
  lead: VideoCardData | null;
  secondary: VideoCardData[];
}> {
  const enabled = await isVideoFirstDiscover();
  if (!enabled) return { enabled: false, lead: null, secondary: [] };

  const cards = (await listVideoClipCards(13))
    .map(toVideoCardData)
    .filter((v): v is VideoCardData => v != null);

  const [lead, ...rest] = cards;
  return { enabled, lead: lead ?? null, secondary: rest.slice(0, 9) };
}
