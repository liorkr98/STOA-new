import { createClient } from "@/lib/supabase/server";

export async function listDismissedReportIds(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feed_dismissals")
      .select("report_id")
      .eq("user_id", userId);
    if (error) throw error;
    return ((data as { report_id: string }[]) ?? []).map((r) => r.report_id);
  } catch {
    return [];
  }
}

export async function dismissFeedReport(userId: string, reportId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("feed_dismissals").upsert(
    { user_id: userId, report_id: reportId },
    { onConflict: "user_id,report_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
