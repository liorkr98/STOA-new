import "server-only";

import { Client } from "@upstash/qstash";

/**
 * QStash job publisher. `enqueueOrRun` publishes a job to QStash when
 * configured, otherwise runs the work inline - so grading and the video
 * pipeline keep working (synchronously, as today) before the QStash account
 * exists. When configured, the work moves off the request/cron function and
 * gains automatic retry + backoff + dead-letter.
 */

export type JobName = "grade" | "notify" | "video-process";

let client: Client | null | undefined;

function qstash(): Client | null {
  if (client !== undefined) return client;
  const token = process.env.QSTASH_TOKEN?.trim();
  client = token ? new Client({ token }) : null;
  return client;
}

export function isQueueConfigured(): boolean {
  return qstash() !== null;
}

function baseUrl(): string {
  return (
    process.env.QSTASH_TARGET_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.stoamarket.ai"
  );
}

export interface EnqueueOptions {
  /** Retries QStash attempts before dead-lettering. */
  retries?: number;
  /** De-dupe id so the same logical job isn't queued twice within a window. */
  deduplicationId?: string;
}

/**
 * Publish `job` to its consumer route, or run `inline` when QStash is absent.
 * Returns whether the work was queued (true) or executed inline (false).
 */
export async function enqueueOrRun<T>(
  job: JobName,
  payload: Record<string, unknown>,
  inline: () => Promise<T>,
  opts: EnqueueOptions = {},
): Promise<{ queued: boolean; result?: T }> {
  const c = qstash();
  if (!c) {
    const result = await inline();
    return { queued: false, result };
  }

  await c.publishJSON({
    url: `${baseUrl()}/api/jobs/${job}`,
    body: payload,
    retries: opts.retries ?? 3,
    ...(opts.deduplicationId ? { deduplicationId: opts.deduplicationId } : {}),
  });
  return { queued: true };
}
