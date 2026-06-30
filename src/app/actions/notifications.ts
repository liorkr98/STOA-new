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

export async function markNotificationRead(id: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("recipient_id", userId);
  revalidatePath("/inbox");
}

export async function markAllNotificationsRead() {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false);
  revalidatePath("/inbox");
}
