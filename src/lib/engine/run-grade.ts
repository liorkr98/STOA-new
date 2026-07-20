import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { gradeDuePredictions } from "@/lib/engine/grade";

/**
 * Shared grading run used by both the cron and the QStash consumer, so the two
 * paths never drift. Idempotent at the row level: the "resolution fields
 * writable once" trigger means a re-run cannot re-resolve an already-resolved
 * call, which is exactly what makes it safe to retry from a queue.
 */
export async function runGradeAndRefresh() {
  const db = createAdminClient();
  const result = await gradeDuePredictions(db);
  try {
    await db.rpc("refresh_platform_stats");
  } catch {
    // platform_stats MV lands in migration 0019; ignore if absent.
  }
  return result;
}
