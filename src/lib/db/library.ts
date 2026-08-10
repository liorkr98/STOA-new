import { createClient } from "@/lib/supabase/server";
import type { Prediction, Report } from "@/lib/types";

const REPORT_FIELDS = "*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*)";

function normalize(row: Record<string, unknown>): Report {
  const raw = Array.isArray(row.prediction) ? (row.prediction[0] ?? null) : (row.prediction ?? null);
  return { ...(row as unknown as Report), prediction: (raw ?? null) as Prediction | null };
}

export interface UnlockedReport {
  report: Report;
  /** When the user unlocked it (report_unlocks.created_at). */
  unlockedAt: string | null;
  /** The unlock price in USD (report.price). */
  price: number | null;
}

/**
 * Reports the user has unlocked (bought), newest first, each with the unlock
 * date and price. Ownership comes from `report_unlocks`; the reports are fetched
 * by id so the join constraint name isn't relied on.
 */
export async function listUnlockedReports(userId: string, limit = 100): Promise<UnlockedReport[]> {
  const supabase = await createClient();
  const { data: unlocks } = await supabase
    .from("report_unlocks")
    .select("report_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (unlocks as { report_id: string; created_at: string | null }[]) ?? [];
  const ids = [...new Set(rows.map((r) => r.report_id))];
  if (ids.length === 0) return [];

  const { data: reportRows } = await supabase.from("reports").select(REPORT_FIELDS).in("id", ids);
  const byId = new Map<string, Report>(
    ((reportRows as Record<string, unknown>[]) ?? []).map((r) => {
      const rep = normalize(r);
      return [rep.id, rep];
    }),
  );

  const result: UnlockedReport[] = [];
  for (const u of rows) {
    const report = byId.get(u.report_id);
    if (!report) continue;
    result.push({ report, unlockedAt: u.created_at, price: report.price });
  }
  return result;
}
