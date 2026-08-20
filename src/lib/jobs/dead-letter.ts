import "server-only";

import { notifySlack } from "@/lib/slack/notify";
import { log } from "@/lib/log";

/**
 * A job that has failed (and will be retried, or has exhausted retries) surfaces
 * in #bugs so a human sees it - the dead-letter path from the hardening spec.
 */
export async function deadLetter(job: string, error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  log("error", "job failed", { job, error: message, ...context });
  try {
    await notifySlack({
      channel: "bugs",
      text: `Job failed: ${job} - ${message}`,
    });
  } catch {
    // Never let alerting failure mask the original error.
  }
}
