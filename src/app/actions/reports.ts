"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBenchmarkQuote, getQuote } from "@/lib/engine/market";
import type { ComposeInput } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue");
  return { supabase, userId: user.id };
}

/** Saves a draft. Returns the report id so the editor can keep autosaving. */
export async function saveDraft(input: ComposeInput): Promise<{ id: string }> {
  const { supabase, userId } = await requireUser();
  const payload = {
    author_id: userId,
    type: input.type,
    title: input.title ?? null,
    summary: input.summary ?? null,
    access: input.access,
    price: input.access === "paid" ? (input.price ?? null) : null,
    ticker: input.ticker ? input.ticker.toUpperCase() : null,
    status: "draft" as const,
  };

  let reportId = input.id;
  if (reportId) {
    await supabase.from("reports").update(payload).eq("id", reportId);
  } else {
    const { data, error } = await supabase.from("reports").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    reportId = (data as { id: string }).id;
  }

  // Body is stored separately so RLS can gate paid/subscriber content.
  await supabase
    .from("report_bodies")
    .upsert({ report_id: reportId, body: input.body ?? null }, { onConflict: "report_id" });

  return { id: reportId };
}

/**
 * Publishes a report. For research + call types with a ticker and direction, it
 * locks the entry price from the live feed (server-side, never client-trusted),
 * captures the SPY baseline for alpha, and schedules resolution.
 */
export async function publishReport(input: ComposeInput): Promise<{ id: string }> {
  const { supabase, userId } = await requireUser();
  const { id } = await saveDraft(input);

  const publishPayload: Record<string, unknown> = {
    status: "published",
    published_at: new Date().toISOString(),
  };
  if (input.fact_check_results) {
    publishPayload.fact_check_results = input.fact_check_results;
  }

  const { error: pubErr } = await supabase
    .from("reports")
    .update(publishPayload)
    .eq("id", id)
    .eq("author_id", userId);
  if (pubErr) throw new Error(pubErr.message);

  const wantsPrediction =
    input.type !== "short_post" && input.ticker && input.direction;

  if (wantsPrediction) {
    const ticker = input.ticker!.toUpperCase();
    const [quote, bench] = await Promise.all([getQuote(ticker), getBenchmarkQuote()]);
    const horizon = input.horizon_days ?? 30;
    const resolvesAt = new Date(Date.now() + horizon * 86_400_000).toISOString();

    await supabase.from("predictions").insert({
      report_id: id,
      author_id: userId,
      ticker,
      direction: input.direction,
      lock_price: quote.price,
      target_price: input.target_price ?? null,
      horizon_days: horizon,
      resolves_at: resolvesAt,
      bench_lock_price: bench.price,
      outcome: "open",
    });
  }

  // Newsletter fan-out: notify followers + active subscribers (best-effort).
  try {
    await supabase.rpc("notify_publication", { p_report_id: id });
  } catch {
    // non-critical
  }

  revalidatePath("/discover");
  revalidatePath("/studio");
  redirect(`/report/${id}`);
}

/** Best-effort view log. Safe to call repeatedly; failures are swallowed. */
export async function recordView(reportId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("report_views").insert({ report_id: reportId, viewer_id: user?.id ?? null });
    await supabase.rpc("increment_views", { p_report_id: reportId });
  } catch {
    // non-critical
  }
}

export async function deleteReport(id: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("reports").delete().eq("id", id).eq("author_id", userId);
  revalidatePath("/studio");
}
