"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createInvite, listInvites, revokeInvite, type InviteRow } from "@/lib/db/invites";

export type InviteActionState = { error?: string; url?: string } | null;

async function requireAdminId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Admin only");
  return user.id;
}

export async function getInvitesForAdmin(): Promise<InviteRow[]> {
  await requireAdminId();
  return listInvites();
}

export async function mintInvite(_prev: InviteActionState, formData: FormData): Promise<InviteActionState> {
  const adminId = await requireAdminId();
  const note = String(formData.get("note") ?? "").trim() || null;
  const maxUses = Number(formData.get("max_uses") ?? 1);
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 50) {
    return { error: "Uses must be a whole number from 1 to 50." };
  }
  const horizon = String(formData.get("horizon") ?? "30d");
  let expiresAt: string | null = null;
  if (horizon === "7d") expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  else if (horizon === "30d") expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  else if (horizon !== "never") return { error: "Pick how long the link should last." };

  try {
    const minted = await createInvite({ createdBy: adminId, note, maxUses, expiresAt });
    revalidatePath("/admin/invites");
    return { url: minted.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create the invite." };
  }
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  await requireAdminId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await revokeInvite(id);
  revalidatePath("/admin/invites");
}
