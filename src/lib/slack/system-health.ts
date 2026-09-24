import "server-only";

import { isRedisConfigured } from "@/lib/redis";
import { isQueueConfigured } from "@/lib/jobs/client";
import { notifySlack, slackContext, slackHeader, slackText } from "./notify";

/**
 * A daily system-health snapshot into #ops (Scale-Hardening Section 3). Surfaces
 * the trends you want to see before they become incidents: whether the cache and
 * queue are actually live.
 */
export async function postSystemHealth(): Promise<void> {
  const lines = [
    `Redis cache: ${isRedisConfigured() ? "on" : "in-memory fallback"}`,
    `Job queue (QStash): ${isQueueConfigured() ? "on" : "cron-inline fallback"}`,
  ];

  await notifySlack({
    channel: "ops",
    text: "System health",
    blocks: [
      slackHeader("System health"),
      slackText(lines.map((l) => `• ${l}`).join("\n")),
      slackContext("Daily · UTC"),
    ],
  });
}
