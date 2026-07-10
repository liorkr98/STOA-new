import { createClient } from "@/lib/supabase/server";
import { planHasRequiredPerks } from "@/lib/perks";

/**
 * Server-side entitlement gate for report bodies (Part C). Mirrors the
 * report_bodies RLS policy so server code (report serving, signed media tokens,
 * export) can check access without leaning on a table read failing. RLS remains
 * the hard backstop; this is the readable, reusable front check.
 *
 * Access ladder: author -> published + (free | unlocked | active sub whose plan
 * rank meets min_plan_rank and includes required_perks).
 */
export async function canReadReport(reportId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: report } = await supabase
    .from("reports")
    .select("author_id, status, access, min_plan_rank, required_perks")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return false;

  if (user && report.author_id === user.id) return true;
  if (report.status !== "published" && report.status !== "resolution_pending_review") return false;
  if (report.access === "free") return true;
  if (!user) return false;

  if (report.access === "paid") {
    const { data } = await supabase
      .from("report_unlocks")
      .select("report_id")
      .eq("report_id", reportId)
      .eq("user_id", user.id)
      .maybeSingle();
    return !!data;
  }

  if (report.access === "subscribers") {
    const { data } = await supabase
      .from("subscriptions")
      .select("renews_at, status, plans(rank, perks)")
      .eq("analyst_id", report.author_id)
      .eq("subscriber_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!data || !data.renews_at) return false;
    if (new Date(data.renews_at as string) <= new Date()) return false;
    const plan = data.plans as { rank?: number; perks?: string[] } | { rank?: number; perks?: string[] }[] | null;
    const row = Array.isArray(plan) ? plan[0] : plan;
    const rank = row?.rank ?? 0;
    const perks = Array.isArray(row?.perks) ? row.perks : [];
    const required = (report.required_perks as string[] | null) ?? [];
    return rank >= (report.min_plan_rank ?? 0) && planHasRequiredPerks(perks, required);
  }

  return false;
}

/**
 * Whether a viewer meets a specific plan rank for an author -- used for per-block
 * gating (a cheaper report teasing a locked valuation/statement/video block).
 */
export async function meetsPlanRank(authorId: string, minRank: number): Promise<boolean> {
  if (minRank <= 0) return true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  if (user.id === authorId) return true;

  const { data } = await supabase
    .from("subscriptions")
    .select("renews_at, status, plans(rank)")
    .eq("analyst_id", authorId)
    .eq("subscriber_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!data || !data.renews_at) return false;
  if (new Date(data.renews_at as string) <= new Date()) return false;
  const plan = data.plans as { rank?: number } | { rank?: number }[] | null;
  const rank = Array.isArray(plan) ? (plan[0]?.rank ?? 0) : (plan?.rank ?? 0);
  return rank >= minRank;
}
