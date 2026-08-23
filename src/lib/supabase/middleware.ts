import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** Any Supabase auth cookie means there is a session worth refreshing. */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

/**
 * True when the access token in the cookie is still valid for at least 20s.
 * `getUser()` is a Singapore Auth round trip; on an already-fresh session it
 * only confirms what the JWT already says, and that confirmation was sitting
 * on every click.
 */
function accessTokenStillFresh(request: NextRequest): boolean {
  const parts = request.cookies
    .getAll()
    .filter((c) => /-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  if (parts.length === 0) return false;
  let raw = parts.map((c) => c.value).join("");
  try {
    if (raw.startsWith("base64-")) {
      raw = Buffer.from(raw.slice(7), "base64").toString("utf8");
    }
    const parsed = JSON.parse(raw) as { expires_at?: number; access_token?: string };
    const session = Array.isArray(parsed) ? parsed[0] : parsed;
    let exp = typeof session?.expires_at === "number" ? session.expires_at : null;
    if (exp == null && typeof session?.access_token === "string") {
      const payload = session.access_token.split(".")[1];
      if (payload) {
        const json = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
        exp = typeof json.exp === "number" ? json.exp : null;
      }
    }
    if (exp == null) return false;
    const expMs = exp > 1e12 ? exp : exp * 1000;
    return expMs > Date.now() + 20_000;
  } catch {
    return false;
  }
}

/**
 * Refreshes the Supabase session cookie.
 *
 * This runs on nearly every request, and `getUser()` is a network round trip to
 * Supabase Auth, so it was adding that latency to every navigation and every
 * public JSON endpoint -- including for signed-out visitors who have no session
 * to refresh at all. Now it returns immediately when no `sb-` cookie is present,
 * which is the common case for anonymous traffic and for the marketing pages.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Render normally before Supabase is configured.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  // No session cookie: nothing to refresh, so skip the auth round trip.
  if (!hasAuthCookie(request)) return response;
  // Token still valid: refreshing it again would only add latency to navigation.
  if (accessTokenStillFresh(request)) return response;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    await supabase.auth.getUser();
  } catch {
    // Supabase unreachable — still serve the page rather than break RSC navigation.
  }

  return response;
}
