import { NextResponse } from "next/server";
import { INVITE_COOKIE, inviteCookieOptions, isInviteOnly } from "@/lib/access/gate";
import { peekInvite } from "@/lib/db/invites";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(req.url);

  if (!isInviteOnly()) {
    return NextResponse.redirect(new URL("/sign-up", url.origin));
  }

  try {
    const peek = await peekInvite(token);
    if (!peek.ok) {
      const back = new URL("/", url.origin);
      back.searchParams.set("invite", "invalid");
      return NextResponse.redirect(back);
    }
  } catch {
    const back = new URL("/", url.origin);
    back.searchParams.set("invite", "invalid");
    return NextResponse.redirect(back);
  }

  const dest = NextResponse.redirect(new URL("/sign-up", url.origin));
  dest.cookies.set(INVITE_COOKIE, token.trim(), inviteCookieOptions(url.protocol === "https:"));
  return dest;
}
