/** Strip control characters invalid in HTTP header values (e.g. pasted CRON_SECRET). */
export function sanitizeEnvValue(value) {
  if (value == null) return "";
  return String(value).replace(/[\x00-\x1f\x7f]/g, "").trim();
}

/** True when value contains chars Vercel rejects for CRON_SECRET. */
export function hasInvalidHeaderChars(value) {
  return /[\x00-\x1f\x7f]/.test(String(value ?? ""));
}
