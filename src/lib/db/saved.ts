import { createClient } from "@/lib/supabase/server";
import { publicationRow as normalize, REPORT_SELECT as REPORT_FIELDS } from "@/lib/db/publication-row";
import type { Report } from "@/lib/types";

export async function listSavedReports(userId: string, limit = 50): Promise<Report[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_reports")
    .select(`report:reports(${REPORT_FIELDS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data as unknown as { report: Record<string, unknown> }[]) ?? [])
    .map((row) => row.report)
    .filter(Boolean)
    .map(normalize);
}
