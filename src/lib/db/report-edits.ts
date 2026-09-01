import { createPublicClient } from "@/lib/supabase/public";

/** The parts of a publication an edit can touch. */
export type EditSection = "headline" | "dek" | "thesis" | "cards" | "tags";

export interface ReportEdit {
  id: string;
  editedAt: string;
  sections: EditSection[];
  /**
   * Headline and dek are public everywhere the publication appears, so the
   * before and after are carried. The thesis is not: it sits behind the
   * paywall, so an edit to it is recorded as having happened and nothing more.
   */
  titleBefore: string | null;
  titleAfter: string | null;
  dekBefore: string | null;
  dekAfter: string | null;
}

const SECTIONS: EditSection[] = ["headline", "dek", "thesis", "cards", "tags"];

function toEdit(row: Record<string, unknown>): ReportEdit {
  const raw = (row.sections as string[] | null) ?? [];
  return {
    id: String(row.id),
    editedAt: String(row.edited_at),
    sections: raw.filter((s): s is EditSection => (SECTIONS as string[]).includes(s)),
    titleBefore: (row.title_before as string | null) ?? null,
    titleAfter: (row.title_after as string | null) ?? null,
    dekBefore: (row.dek_before as string | null) ?? null,
    dekAfter: (row.dek_after as string | null) ?? null,
  };
}

/**
 * Every recorded edit of one publication, newest first.
 *
 * Returns an empty list rather than throwing when the table is not there yet,
 * so the marker simply does not render until migration 0063 is applied.
 */
export async function listReportEdits(reportId: string): Promise<ReportEdit[]> {
  try {
    const db = createPublicClient();
    const { data, error } = await db
      .from("report_edits")
      .select("id, edited_at, sections, title_before, title_after, dek_before, dek_after")
      .eq("report_id", reportId)
      .order("edited_at", { ascending: false });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(toEdit);
  } catch {
    return [];
  }
}

/**
 * Which of these publications have been edited, and when they last were. One
 * query for a whole list, so a feed or a profile can show the marker without a
 * request per row.
 */
export async function editedAtByReport(
  reportIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (reportIds.length === 0) return out;
  try {
    const db = createPublicClient();
    const { data, error } = await db
      .from("report_edits")
      .select("report_id, edited_at")
      .in("report_id", reportIds)
      .order("edited_at", { ascending: false });
    if (error || !data) return out;
    for (const row of data as { report_id: string; edited_at: string }[]) {
      if (!out.has(row.report_id)) out.set(row.report_id, row.edited_at);
    }
    return out;
  } catch {
    return out;
  }
}
