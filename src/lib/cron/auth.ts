import "server-only";

/** CRON_SECRET trimmed — pasted values often include a trailing newline. */
export function cronSecret(): string | undefined {
  const raw = process.env.CRON_SECRET;
  if (!raw) return undefined;
  return raw.replace(/[\x00-\x1f\x7f]/g, "").trim() || undefined;
}

export function isAuthorizedCron(request: Request): boolean {
  const secret = cronSecret();
  const auth = request.headers.get("authorization");
  return Boolean(secret && auth === `Bearer ${secret}`);
}
