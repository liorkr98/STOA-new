import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "chart-snapshots";

/** Remove all chart PNGs for a draft report (safe — locked reports cannot be deleted). */
export async function deleteChartSnapshotsForReport(
  supabase: SupabaseClient,
  creatorId: string,
  reportId: string,
): Promise<void> {
  const folder = `${creatorId}/${reportId}`;
  const { data: files, error } = await supabase.storage.from(BUCKET).list(folder);
  if (error || !files?.length) return;

  const paths = files
    .filter((f) => f.name && !f.name.startsWith("."))
    .map((f) => `${folder}/${f.name}`);

  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
}
