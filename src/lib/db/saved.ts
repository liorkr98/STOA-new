import { createClient } from "@/lib/supabase/server";
import type { Prediction, Report } from "@/lib/types";

const REPORT_FIELDS =
  "*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*)";

function normalize(row: Record<string, unknown>): Report {
  const raw = Array.isArray(row.prediction)
    ? (row.prediction[0] ?? null)
    : (row.prediction ?? null);
  return { ...(row as unknown as Report), prediction: (raw ?? null) as Prediction | null };
}

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
