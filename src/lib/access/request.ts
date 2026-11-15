import { cookies } from "next/headers";
import { INVITE_COOKIE, isInviteOnly } from "@/lib/access/gate";
import { peekInvite } from "@/lib/db/invites";

export async function readInviteCookie(): Promise<string | null> {
  const token = (await cookies()).get(INVITE_COOKIE)?.value?.trim() ?? "";
  return token || null;
}

/** True when sign-up is allowed: preview is open, or this browser holds a live invite. */
export async function canCreateAccount(): Promise<boolean> {
  if (!isInviteOnly()) return true;
  const token = await readInviteCookie();
  if (!token) return false;
  try {
    return (await peekInvite(token)).ok;
  } catch {
    return false;
  }
}
