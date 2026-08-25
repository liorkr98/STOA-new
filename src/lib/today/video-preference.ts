/**
 * How Today's bands lean towards publications that carry a ready clip.
 *
 * Stoa's output is the creator's face and voice, so a band that ranks
 * candidates should surface the ones a reader can watch. This is a preference
 * and not a filter: the weight rides on top of whatever score the band already
 * computed, so a written report that is genuinely the strongest still wins, and
 * `MAX_VIDEO_SHARE` stops any band from turning into a video-only rail.
 *
 * Deliberately not applied to the gate that decides whether a publication
 * belongs in a band at all. Trending Now says "gaining fastest today", and a
 * clip does not make something gain faster: the weight orders the band, the
 * publication's own velocity still decides whether it is in it.
 */

/**
 * A ready clip multiplies a band's own score by this much.
 *
 * Chosen to be a lean rather than an override. At 1.35 a video publication
 * outranks a written one it was already within about a quarter of, and loses to
 * anything clearly stronger, which is the "preference, not a filter" line.
 */
export const VIDEO_WEIGHT = 1.35;

/** No band may be more than this share video, however much video is available. */
export const MAX_VIDEO_SHARE = 0.7;

/** Apply the lean to a band's own score. */
export function preferVideo(score: number, hasVideo: boolean): number {
  return hasVideo ? score * VIDEO_WEIGHT : score;
}

/**
 * How many of the first `filled` slots of a band may hold video.
 *
 * Applied as the band is filled rather than once at the end, so the share holds
 * at every depth and not just at the bottom. That matters because bands get
 * truncated: Trending Now shows five of its sixteen on a phone, and a cap
 * checked only against the full sixteen would happily hand the phone five
 * videos and call the band mixed.
 *
 * The `max(1, ...)` is what lets a band open with video at all, since a floor
 * of a single slot is zero.
 */
export function videoAllowance(filled: number): number {
  return Math.max(1, Math.floor(filled * MAX_VIDEO_SHARE));
}

/**
 * Take `size` items from `candidates`, keeping the ranked order but letting a
 * written publication jump a video one whenever the band has had its share.
 *
 * Walks the two forms as separate queues so a held-back video is reconsidered
 * at every later slot rather than being spent. Filling straight down the list
 * and setting the skipped videos aside looks equivalent and is not: a pool that
 * opens with a run of clips sends all of them to the reserve before the band is
 * wide enough to afford a second one, and the band ends up with less video than
 * its own cap allows.
 *
 * The share is a cap on video, never a requirement for written work. When only
 * clips are left the band fills with clips, because a short band is a worse
 * outcome than a video-heavy one: the cap exists to keep written work visible,
 * not to leave holes in the page.
 */
export function fillBand<T>(candidates: T[], size: number, hasVideo: (item: T) => boolean): T[] {
  if (size <= 0) return [];
  const ranked = candidates.map((item, rank) => ({ item, rank }));
  const videos = ranked.filter((c) => hasVideo(c.item));
  const written = ranked.filter((c) => !hasVideo(c.item));

  const chosen: T[] = [];
  let v = 0;
  let w = 0;
  let videoTaken = 0;

  while (chosen.length < size && (v < videos.length || w < written.length)) {
    const videoLeft = v < videos.length;
    const writtenLeft = w < written.length;
    const videoAllowed = videoLeft && videoTaken + 1 <= videoAllowance(chosen.length + 1);
    // With both on offer the better-ranked one wins; the cap only ever decides
    // between them, and never reaches past the end of the other queue.
    const takeVideo = videoAllowed && (!writtenLeft || videos[v].rank < written[w].rank);

    if (takeVideo || (videoLeft && !writtenLeft)) {
      chosen.push(videos[v].item);
      v += 1;
      videoTaken += 1;
    } else if (writtenLeft) {
      chosen.push(written[w].item);
      w += 1;
    } else {
      break;
    }
  }
  return chosen;
}
