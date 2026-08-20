import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** Any Supabase auth cookie means there is a session worth refreshing. */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
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
