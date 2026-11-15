import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/seo/site";
import { hashInviteToken, looksLikeInviteToken, newInviteToken } from "@/lib/access/tokens";

export type InviteRow = {
  id: string;
  token_prefix: string;
  created_by: string;
  note: string | null;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type InvitePeek = {
  ok: boolean;
  remaining: number;
};

function admin() {
  return createAdminClient();
}

export async function peekInvite(token: string): Promise<InvitePeek> {
  if (!looksLikeInviteToken(token)) return { ok: false, remaining: 0 };
  const { data, error } = await admin()
    .from("invites")
    .select("max_uses, use_count, expires_at, revoked_at")
    .eq("token_hash", hashInviteToken(token))
    .maybeSingle();
  if (error || !data) return { ok: false, remaining: 0 };
  if (data.revoked_at) return { ok: false, remaining: 0 };
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    return { ok: false, remaining: 0 };
  }
  const remaining = data.max_uses - data.use_count;
  if (remaining <= 0) return { ok: false, remaining: 0 };
  return { ok: true, remaining };
}

/**
 * Atomically spend one use. Returns false if the link is spent, expired,
 * revoked, or missing. Safe to call after the auth user already exists.
 */
export async function consumeInvite(token: string, userId: string): Promise<boolean> {
  if (!looksLikeInviteToken(token)) return false;
  const client = admin();
  const tokenHash = hashInviteToken(token);

  const { data: invite, error: lookupError } = await client
    .from("invites")
    .select("id, max_uses, use_count, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (lookupError || !invite) return false;
  if (invite.revoked_at) return false;
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) return false;
  if (invite.use_count >= invite.max_uses) return false;

  const { data: spent, error: spendError } = await client
    .from("invites")
    .update({ use_count: invite.use_count + 1 })
    .eq("id", invite.id)
    .eq("use_count", invite.use_count)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (spendError || !spent) return false;

  const { error: redeemError } = await client.from("invite_redemptions").insert({
    invite_id: invite.id,
    user_id: userId,
  });
  if (redeemError) {
    const { data: mine } = await client
      .from("invite_redemptions")
      .select("id")
      .eq("invite_id", invite.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (mine) return true;
    await client.from("invites").update({ use_count: invite.use_count }).eq("id", invite.id);
    return false;
  }
  return true;
}

export async function listInvites(): Promise<InviteRow[]> {
  const { data, error } = await admin()
    .from("invites")
    .select("id, token_prefix, created_by, note, max_uses, use_count, expires_at, revoked_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as InviteRow[];
}

export async function createInvite(input: {
  createdBy: string;
  note: string | null;
  maxUses: number;
  expiresAt: string | null;
}): Promise<{ url: string; prefix: string }> {
  const minted = newInviteToken();
  const { error } = await admin().from("invites").insert({
    token_hash: minted.tokenHash,
    token_prefix: minted.tokenPrefix,
    created_by: input.createdBy,
    note: input.note,
    max_uses: input.maxUses,
    expires_at: input.expiresAt,
  });
  if (error) throw error;
  return { url: `${SITE_URL}/join/${minted.token}`, prefix: minted.tokenPrefix };
}

export async function revokeInvite(id: string): Promise<void> {
  const { error } = await admin()
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null);
  if (error) throw error;
}
