import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { readMinutes } from "@/lib/reports/reading";

/**
 * How long a gated body takes to read, for a reader who may not read it.
 *
 * The byline promises a reading time and the locked section says how much
 * lies past it, and neither can be worked out from a body RLS will not
 * return. So the body is read here with the service key and reduced to one
 * number before anything leaves the server: the words never do. Published
 * pieces only, so this cannot size a draft.
 */
export async function gatedReadMinutes(reportId: string): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const { data: report } = await admin
      .from("reports")
      .select("status")
      .eq("id", reportId)
      .maybeSingle();
    if ((report as { status: string } | null)?.status !== "published") return null;
    const { data } = await admin
      .from("report_bodies")
      .select("body")
      .eq("report_id", reportId)
      .maybeSingle();
    return readMinutes((data as { body: string | null } | null)?.body);
  } catch {
    return null;
  }
}
