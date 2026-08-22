import "server-only";
import { listVideoClipCards } from "@/lib/db/video-clips";
import { toVideoCardData } from "@/lib/video/card";
import type { VideoCardData } from "@/lib/video/card-data";

/**
 * Video payload for the Dispatch (Part 5). Lead = the single most important
 * clip (earns an actually-playing preview); secondary = the rest, rendered with
 * the same Part 4 card component.
 *
 * `enabled` now means "there is video to show" rather than "the rollout flag is
 * on". The flag it used to consult chose between a video Feed and a text
 * mosaic; there is no text mosaic any more, so the only question left is
 * whether any clip is ready, and an empty list answers it.
 */
export async function getDispatchVideos(): Promise<{
  enabled: boolean;
  lead: VideoCardData | null;
  secondary: VideoCardData[];
}> {
  const cards = (await listVideoClipCards(13))
    .map(toVideoCardData)
    .filter((v): v is VideoCardData => v != null);
  if (cards.length === 0) return { enabled: false, lead: null, secondary: [] };

  const [lead, ...rest] = cards;
  return { enabled: true, lead: lead ?? null, secondary: rest.slice(0, 9) };
}
