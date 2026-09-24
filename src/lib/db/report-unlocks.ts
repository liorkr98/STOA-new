import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Which of these publications anyone has bought. Read with the service key:
 * a creator cannot see their buyers' unlock rows, and must not, but the
 * Studio needs to know whether any exist. Returns ids only.
 */
export async function soldReportIds(reportIds: string[]): Promise<Set<string>> {
  if (reportIds.length === 0) return new Set();
  const { data, error } = await createAdminClient()
    .from("report_unlocks")
    .select("report_id")
    .in("report_id", reportIds);
  if (error) throw new Error(`Could not check purchases: ${error.message}`);
  return new Set((data ?? []).map((r) => r.report_id as string));
}
