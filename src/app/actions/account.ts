"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { revalidatePath } from "next/cache";

export async function requestAccountDeletion(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue" };

  const rl = await rateLimit("deletion-request", user.id, { limit: 3, windowSeconds: 86400 });
  if (!rl.success) return { error: "A deletion request was already sent. Wait before retrying." };

  const { error } = await supabase.from("deletion_requests").insert({
    user_id: user.id,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "A deletion request is already pending." };
    }
    return { error: error.message };
  }
  revalidatePath("/settings");
  return { ok: true };
}
