/**
 * Bunny omits `length` until bytes have arrived. Writing NaN/undefined into
 * `duration_seconds` used to throw on the publication page right after upload.
 */
export function clipDurationSeconds(length: unknown): number {
  return typeof length === "number" && Number.isFinite(length) && length >= 0
    ? Math.round(length)
    : 0;
}
