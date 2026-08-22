"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue");
  return { supabase, userId: user.id };
}

export async function toggleFollow(analystId: string) {
  const { supabase, userId } = await requireUser();
  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("analyst_id", analystId)
    .maybeSingle();

  if (existing) {
    await supabase.from("follows").delete().eq("follower_id", userId).eq("analyst_id", analystId);
  } else {
    await supabase.from("follows").insert({ follower_id: userId, analyst_id: analystId });
    try {
      await supabase.rpc("notify_follow", { p_analyst_id: analystId });
    } catch {
      // non-critical
    }
  }
  revalidatePath("/feed");
  return { following: !existing };
}

export async function toggleLike(reportId: string) {
  const { supabase, userId } = await requireUser();
  const { data: existing } = await supabase
    .from("likes")
    .select("report_id")
    .eq("report_id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("report_id", reportId).eq("user_id", userId);
  } else {
    await supabase.from("likes").insert({ report_id: reportId, user_id: userId });
    try {
      await supabase.rpc("notify_report_event", { p_report_id: reportId, p_kind: "like" });
    } catch {
      // non-critical
    }
  }
  revalidatePath(`/report/${reportId}`);
  return { liked: !existing };
}

export async function toggleSave(reportId: string) {
  const { supabase, userId } = await requireUser();
  const { data: existing } = await supabase
    .from("saved_reports")
    .select("report_id")
    .eq("report_id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_reports").delete().eq("report_id", reportId).eq("user_id", userId);
  } else {
    await supabase.from("saved_reports").insert({ report_id: reportId, user_id: userId });
  }
  revalidatePath("/saved");
  return { saved: !existing };
}

export async function addComment(reportId: string, body: string) {
  const { supabase, userId } = await requireUser();
  const text = body.trim();
  if (!text) return { error: "Comment is empty" };
  const { error } = await supabase
    .from("comments")
    .insert({ report_id: reportId, author_id: userId, body: text });
  if (error) return { error: error.message };
  try {
    await supabase.rpc("notify_report_event", { p_report_id: reportId, p_kind: "comment" });
  } catch {
    // non-critical
  }
  revalidatePath(`/report/${reportId}`);
  return { ok: true };
}
