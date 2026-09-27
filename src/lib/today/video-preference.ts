/**
 * How Today's ranking leans towards publications that carry a ready clip.
 *
 * Stoa's output is the creator's face and voice, so the ranking that picks
 * the lead and orders the bands should surface what a reader can watch. This
 * is a preference and not a filter: the weight rides on top of the velocity a
 * publication earned, so a written report that is genuinely the strongest
 * still leads. The page keeps written work visible by giving it its own band
 * (Worth reading) rather than by capping video's share of a mixed one.
 */

/**
 * A ready clip multiplies a band's own score by this much.
 *
 * Chosen to be a lean rather than an override. At 1.35 a video publication
 * outranks a written one it was already within about a quarter of, and loses to
 * anything clearly stronger, which is the "preference, not a filter" line.
 */
export const VIDEO_WEIGHT = 1.35;

/** Apply the lean to a band's own score. */
export function preferVideo(score: number, hasVideo: boolean): number {
  return hasVideo ? score * VIDEO_WEIGHT : score;
}
