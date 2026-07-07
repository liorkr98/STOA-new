"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteChartSnapshotsForReport } from "@/lib/reports/chart-storage";
import { PublishReportError, validateAndPublishReport } from "@/lib/reports/publish-report";
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

  await supabase
    .from("report_bodies")
    .upsert({ report_id: reportId, body: input.body ?? null }, { onConflict: "report_id" });

  await captureVersion(supabase, reportId, userId, input);

  return { id: reportId };
}

/** List versions for the history panel (author-only via RLS). */
export async function listVersionsAction(reportId: string) {
  const { listVersions } = await import("@/lib/db/report-versions");
  return listVersions(reportId);
}

/**
 * Restore a draft to an earlier version (Part E). Snapshots the CURRENT state
 * first (so a restore is itself undoable), then overwrites title + body.
 * Drafts only -- published reports are locked at the database level.
 */
export async function restoreVersionAction(
  reportId: string,
  versionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireUser();

  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id, status, title")
    .eq("id", reportId)
    .maybeSingle();
  if (!report || report.author_id !== userId) return { ok: false, error: "Not your draft" };
  if (report.status !== "draft") return { ok: false, error: "Published reports are locked" };

  const { getVersionBody } = await import("@/lib/db/report-versions");
  const version = await getVersionBody(versionId);
  if (!version) return { ok: false, error: "Version not found" };

  const { data: current } = await supabase
    .from("report_bodies")
    .select("body")
    .eq("report_id", reportId)
    .maybeSingle();
  if (current?.body) {
    await supabase.from("report_versions").insert({
      report_id: reportId,
      author_id: userId,
      title: report.title,
      body: current.body,
    });
  }

  await supabase.from("reports").update({ title: version.title }).eq("id", reportId);
  const { error } = await supabase
    .from("report_bodies")
    .upsert({ report_id: reportId, body: version.body }, { onConflict: "report_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/studio/compose");
  return { ok: true };
}

const VERSION_INTERVAL_MS = 5 * 60_000;

/**
 * Autosave history (Part E). Snapshots title+body into report_versions at most
 * once per interval, so an analyst can recover an earlier draft. Best-effort:
 * a failed snapshot never blocks the save. Publish still locks permanently.
 */
async function captureVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  userId: string,
  input: ComposeInput,
) {
  try {
    if (!input.body) return;
    const { data: latest } = await supabase
      .from("report_versions")
      .select("created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest && Date.now() - new Date(latest.created_at as string).getTime() < VERSION_INTERVAL_MS) {
      return;
    }
    await supabase.from("report_versions").insert({
      report_id: reportId,
      author_id: userId,
      title: input.title ?? null,
      body: input.body,
    });
  } catch {
    // History is a convenience; the draft save must never fail because of it.
  }
}

/**
 * Publishes a report. For research + call types with a ticker and direction, it
 * locks the entry price from the live feed (server-side, never client-trusted),
 * captures the SPY baseline for alpha, and schedules resolution.
 */
export async function publishReport(input: ComposeInput): Promise<{ id: string }> {
  const { supabase, userId } = await requireUser();

  try {
    const { id } = await validateAndPublishReport(supabase, userId, input);
    revalidatePath("/");
    revalidatePath("/discover");
    revalidatePath("/studio");
    redirect(`/report/${id}`);
  } catch (e) {
    if (e instanceof PublishReportError) throw new Error(e.message);
    throw e;
  }
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

  const { data: report } = await supabase
    .from("reports")
    .select("status, locked_at")
    .eq("id", id)
    .eq("author_id", userId)
    .maybeSingle();

  if (report?.status !== "draft" || report.locked_at) {
    throw new Error("Only unlocked drafts can be deleted.");
  }

  await supabase.from("reports").delete().eq("id", id).eq("author_id", userId);
  await deleteChartSnapshotsForReport(supabase, userId, id);
  revalidatePath("/studio");
}

/**
 * Posts a short note (Substack-style) — the social discovery layer. Any signed-in
 * user can post. Published immediately, no prediction, fans out to followers.
 */
export async function postNote(body: string): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, userId } = await requireUser();
  const text = body.trim();
  if (!text) return { error: "Write something first." };
  if (text.length > 1000) return { error: "Notes are limited to 1000 characters." };

  await supabase.rpc("ensure_user_profile");

  const { data, error } = await supabase
    .from("reports")
    .insert({
      author_id: userId,
      type: "short_post",
      summary: text,
      access: "free",
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const noteId = (data as { id: string }).id;
  try {
    await supabase.rpc("notify_publication", { p_report_id: noteId });
  } catch {
    // non-critical
  }

  revalidatePath("/discover");
  return { ok: true };
}
