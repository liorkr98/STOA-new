import { createClient } from "@/lib/supabase/server";

/**
 * Autosave version history (Part E). Rows are written by captureVersion inside
 * saveDraft; this is the read/restore side. RLS: author-only.
 */

export interface ReportVersion {
  id: string;
  report_id: string;
  title: string | null;
  created_at: string;
}

export async function listVersions(reportId: string, limit = 30): Promise<ReportVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_versions")
    .select("id, report_id, title, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as ReportVersion[];
}

export async function getVersionBody(
  versionId: string,
): Promise<{ title: string | null; body: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_versions")
    .select("title, body")
    .eq("id", versionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { title: string | null; body: string | null };
}
