/**
 * How long to wait between Bunny polls after an upload, while the webhook is
 * missing and the daily cron is the only other backstop.
 *
 * Sum is a little over ten minutes, which covers a slow transcode without
 * leaving a finished clip sitting until 05:00 UTC.
 */
export const CLIP_RECONCILE_FOLLOW_UP_SECONDS = [8, 8, 12, 15, 20, 30, 45, 60, 90, 120, 180] as const;

export function nextClipReconcileDelaySeconds(attempt: number): number | null {
  if (attempt < 0 || attempt >= CLIP_RECONCILE_FOLLOW_UP_SECONDS.length) return null;
  return CLIP_RECONCILE_FOLLOW_UP_SECONDS[attempt]!;
}
