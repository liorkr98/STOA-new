import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isInviteAllowlistedPath, isInviteOnly, isMachinePath } from "@/lib/access/gate";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * The /dev/* fixture routes render every surface with fictional data. In
 * production they stay off the beaten path but reachable on purpose: visit any
 * /dev URL once with `?dev=1` and a cookie keeps them open for 30 days on that
 * browser. Nothing under /dev reads or writes user data, so the gate is about
 * not confusing visitors, not about security. `DEV_ROUTES_OPEN=1` in the
 * environment opens them without the cookie (preview deployments).
 */
const DEV_COOKIE = "stoa-dev";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (process.env.NODE_ENV === "production" && pathname.startsWith("/dev")) {
    const openByEnv = process.env.DEV_ROUTES_OPEN === "1";
    const openByCookie = request.cookies.get(DEV_COOKIE)?.value === "1";
    const openByQuery = searchParams.get("dev") === "1";
    if (!openByEnv && !openByCookie && !openByQuery) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (openByQuery && !openByCookie) {
      const clean = request.nextUrl.clone();
      clean.searchParams.delete("dev");
      const res = NextResponse.redirect(clean);
      res.cookies.set(DEV_COOKIE, "1", { path: "/dev", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
      return res;
    }
  }

  if (isInviteOnly() && !isMachinePath(pathname)) {
    const signedIn = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
    if (!signedIn && !isInviteAllowlistedPath(pathname)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Sign in required" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return updateSession(request);
}

/**
 * Excludes static assets and webhooks. Public JSON (quotes, search, stats, og)
 * used to skip this matcher; under invite-only they must hit the gate, and
 * signed-in users still skip the Auth round trip inside updateSession.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|sentry-tunnel|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|map)$).*)",
  ],
};
