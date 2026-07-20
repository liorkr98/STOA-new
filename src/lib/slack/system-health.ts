import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isRedisConfigured } from "@/lib/redis";
import { isQueueConfigured } from "@/lib/jobs/client";
import { notifySlack, slackContext, slackHeader, slackText } from "./notify";

/**
 * A daily system-health snapshot into #ops (Scale-Hardening Section 3). Surfaces
 * the trends you want to see before they become incidents: whether the cache and
 * queue are actually live, grading freshness, and the backlog of calls past due
 * (a growing number means grading is falling behind).
 */
export async function postSystemHealth(): Promise<void> {
  const admin = createAdminClient();

  const { data: lastSnap } = await admin
    .from("moat_score_snapshots")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: dueCount } = await admin
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("outcome", "open")
    .lte("resolves_at", new Date().toISOString());

  const lines = [
    `Redis cache: ${isRedisConfigured() ? "on" : "in-memory fallback"}`,
    `Job queue (QStash): ${isQueueConfigured() ? "on" : "cron-inline fallback"}`,
    `Last grade snapshot: ${lastSnap?.created_at ? new Date(lastSnap.created_at).toISOString() : "none"}`,
    `Open calls past due (grading backlog): ${dueCount ?? 0}`,
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
