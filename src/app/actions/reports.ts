"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteChartSnapshotsForReport } from "@/lib/reports/chart-storage";
import { PublishReportError, validateAndPublishReport } from "@/lib/reports/publish-report";
import { normalizeTags } from "@/lib/tags/validate";
import type { ComposeInput, AccessType, ContentType } from "@/lib/types";

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
  // A draft may be untagged; publish is where the primary tag becomes mandatory.
  const tags = await normalizeTags(supabase, input);
  const payload = {
    author_id: userId,
    type: input.type,
    title: input.title ?? null,
    summary: input.summary ?? null,
    access: input.access,
    price: input.access === "paid" ? (input.price ?? null) : null,
    members_included: input.access === "paid" ? Boolean(input.members_included) : false,
    linked_report_id: input.linked_report_id ?? null,
    feed_preview_seconds: input.feed_preview_seconds ?? null,
    min_plan_rank:
      input.access === "subscribers" ? Math.max(0, input.min_plan_rank ?? 0) : 0,
    required_perks: input.access === "subscribers" ? (input.required_perks ?? []) : [],
    ticker: input.ticker ? input.ticker.toUpperCase() : null,
    primary_tag: tags.primary_tag,
    secondary_tags: tags.secondary_tags,
    theme_tag: tags.theme_tag,
    scheduled_for: input.scheduled_for ?? null,
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
export async function publishReport(
  input: ComposeInput,
  /**
   * Compose sets this false when a chosen video still has to be uploaded: the
   * upload route requires the report to be locked first, so the client needs
   * the id back and navigates itself once the clip is attached.
   */
  redirectAfter = true,
): Promise<{ id: string }> {
  const { supabase, userId } = await requireUser();

  try {
    const { id } = await validateAndPublishReport(supabase, userId, input);
    revalidatePath("/");
    revalidatePath("/home");
    revalidatePath("/feed");
    revalidatePath("/studio");
    if (!redirectAfter) return { id };
    redirect(`/report/${id}`);
  } catch (e) {
    if (e instanceof PublishReportError) throw new Error(e.message);
    throw e;
  }
}

/**
 * Archiving is the only removal a creator gets, and it is deliberately not a
 * delete. The database refuses to delete anything locked (0034), so the record
 * behind a publication is never rewritten: archiving flips status only, the
 * trigger writes report.archived to the audit log, and the row, its body, its
 * content hash and any locked call stay exactly as published.
 *
 * A locked call lives in `predictions`, which is keyed off the report but read
 * without a status filter, so the track record keeps counting an archived
 * call and it still resolves on schedule. Archiving cannot bury a miss.
 */
export async function archivePublication(
  reportId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireUser();

  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id, status")
    .eq("id", reportId)
    .eq("author_id", userId)
    .maybeSingle();
  if (!report) return { ok: false, error: "Not your publication" };
  if (report.status === "archived") return { ok: true };
  if (report.status === "draft") {
    return { ok: false, error: "Drafts are deleted, not archived." };
  }

  const { error } = await supabase
    .from("reports")
    .update({ status: "archived" })
    .eq("id", reportId)
    .eq("author_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/feed");
  revalidatePath("/studio");
  revalidatePath(`/report/${reportId}`);
  return { ok: true };
}

/**
 * Deleting a publication outright.
 *
 * The permanence guarantee exists to stop an analyst burying a bad call, so it
 * applies to calls and not to everything a creator ever wrote. A publication
 * carrying no call is content, and a creator may remove their own content.
 *
 * A publication carrying a call is refused here and refused again by the
 * database (0062), which checks for a `predictions` row rather than trusting
 * this function to have looked. Archiving stays the only option for those.
 *
 * This is irreversible. There is no restore, and the caller is responsible for
 * having said so plainly before getting here.
 */
export async function deletePublication(
  reportId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireUser();

  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id, status")
    .eq("id", reportId)
    .eq("author_id", userId)
    .maybeSingle();
  if (!report) return { ok: false, error: "Not your publication" };

  const { data: call } = await supabase
    .from("predictions")
    .select("id")
    .eq("report_id", reportId)
    .maybeSingle();
  if (call) {
    return {
      ok: false,
      error: "This publication carries a locked call, so it can be archived but not deleted.",
    };
  }

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId)
    .eq("author_id", userId);
  if (error) return { ok: false, error: error.message };

  await deleteChartSnapshotsForReport(supabase, userId, reportId);

  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/feed");
  revalidatePath("/studio");
  revalidatePath("/explore");
  return { ok: true };
}

/** Undoes an archive. Archiving hides a publication; it never destroys it. */
export async function restorePublication(
  reportId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireUser();

  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id, status")
    .eq("id", reportId)
    .eq("author_id", userId)
    .maybeSingle();
  if (!report) return { ok: false, error: "Not your publication" };
  if (report.status !== "archived") return { ok: true };

  const { error } = await supabase
    .from("reports")
    .update({ status: "published" })
    .eq("id", reportId)
    .eq("author_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/feed");
  revalidatePath("/studio");
  revalidatePath(`/report/${reportId}`);
  return { ok: true };
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

/** Update access mode and tier for a draft report (author only). */
export async function updateReportAccess(input: {
  id: string;
  access: AccessType;
  price?: number | null;
  members_included?: boolean;
  min_plan_rank?: number;
  required_perks?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireUser();
  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id, status, locked_at")
    .eq("id", input.id)
    .eq("author_id", userId)
    .maybeSingle();
  if (!report) return { ok: false, error: "Report not found" };

  const { error } = await supabase
    .from("reports")
    .update({
      access: input.access,
      price: input.access === "paid" ? (input.price ?? null) : null,
      members_included: input.access === "paid" ? Boolean(input.members_included) : false,
      min_plan_rank: input.access === "subscribers" ? Math.max(0, input.min_plan_rank ?? 0) : 0,
      required_perks: input.access === "subscribers" ? (input.required_perks ?? []) : [],
    })
    .eq("id", input.id);
  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "Only approved analysts can manage published reports." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/studio");
  revalidatePath("/studio/compose");
  revalidatePath("/feed");
  revalidatePath(`/report/${input.id}`);
  return { ok: true };
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

  const { error } = await supabase.from("reports").delete().eq("id", id).eq("author_id", userId);
  if (error) throw new Error(error.message);

  await deleteChartSnapshotsForReport(supabase, userId, id);
  revalidatePath("/studio");
}

/** Hides a published report from feeds. Track record (prediction) is preserved. */
export async function archiveReport(id: string) {
  const { supabase, userId } = await requireUser();

  const { data: report } = await supabase
    .from("reports")
    .select("status, locked_at")
    .eq("id", id)
    .eq("author_id", userId)
    .maybeSingle();

  if (!report || report.status !== "published") {
    throw new Error("Only published reports can be archived.");
  }

  const { error } = await supabase
    .from("reports")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("author_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/studio");
  revalidatePath("/feed");
  revalidatePath(`/report/${id}`);
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

  if (error) {
    // RLS (reports_insert, supabase/migrations/0034) rejects a published row
    // from an account an admin hasn't approved as an analyst -- surfaces as a
    // generic policy-violation error, so translate it to something a reader
    // of this error message can actually act on.
    if (error.code === "42501") {
      return { error: "Only approved analysts can publish. Apply to become an analyst first." };
    }
    return { error: error.message };
  }

  const noteId = (data as { id: string }).id;
  try {
    await supabase.rpc("notify_publication", { p_report_id: noteId });
  } catch {
    // non-critical
  }

  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/feed");
  return { ok: true };
}

export async function listLinkablePublications(input: {
  excludeId?: string;
  types: ContentType[];
}): Promise<{ id: string; title: string | null; summary: string | null; type: ContentType; status: string; ticker: string | null }[]> {
  const { userId } = await requireUser();
  const { listLinkableByAuthor } = await import("@/lib/db/reports");
  return listLinkableByAuthor(userId, {
    excludeId: input.excludeId,
    types: input.types,
  });
}
