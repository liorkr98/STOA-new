/**
 * How long to wait between Bunny polls after an upload, while the webhook is
 * missing and the daily cron is the only other backstop.
 *
 * The first eleven delays cover a little over ten minutes (a missing upload,
 * or a small file that encodes quickly). After that, poll every five minutes
 * for two more hours: a ~90 MB phone clip has taken about an hour to encode
 * in this library, and stopping at ten minutes left a finished video sitting
 * until someone reopened the publication.
 */
export const CLIP_RECONCILE_FOLLOW_UP_SECONDS = [8, 8, 12, 15, 20, 30, 45, 60, 90, 120, 180] as const;

/** Five minutes between looks once the short ramp is spent. */
export const ENCODE_FOLLOW_UP_SECONDS = 300;

/** Twenty-four of those: two extra hours on top of the ramp. */
export const ENCODE_FOLLOW_UP_COUNT = 24;

export function nextClipReconcileDelaySeconds(attempt: number): number | null {
  if (attempt < 0) return null;
  if (attempt < CLIP_RECONCILE_FOLLOW_UP_SECONDS.length) {
    return CLIP_RECONCILE_FOLLOW_UP_SECONDS[attempt]!;
  }
  const extra = attempt - CLIP_RECONCILE_FOLLOW_UP_SECONDS.length;
  if (extra < ENCODE_FOLLOW_UP_COUNT) return ENCODE_FOLLOW_UP_SECONDS;
  return null;
}

/** Sum of every delay in the chain, used by tests and diagnostics. */
export function clipFollowUpHorizonSeconds(): number {
  const ramp = CLIP_RECONCILE_FOLLOW_UP_SECONDS.reduce((sum, n) => sum + n, 0);
  return ramp + ENCODE_FOLLOW_UP_SECONDS * ENCODE_FOLLOW_UP_COUNT;
}

/**
 * After the browser said TUS finished, Bunny still sitting with no stored
 * bytes and no encode progress is not a slow transcode. Status 2 with
 * hasOriginal true is the same fault as status 0. Four follow-ups is about
 * 45 seconds.
 */
export const EMPTY_UPLOAD_GIVE_UP_ATTEMPT = 4;
