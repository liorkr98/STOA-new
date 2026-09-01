import { cachedPage } from "@/lib/cache/page";

export type OAuthProvider = "google" | "apple" | "linkedin_oidc" | "twitter";

const CANDIDATES: OAuthProvider[] = ["google", "apple", "linkedin_oidc", "twitter"];

/**
 * Which social providers this Supabase project actually has switched on.
 *
 * Read rather than hardcoded so the buttons follow the project: enabling Apple
 * in the dashboard makes its button appear without a deploy, and a provider
 * that is off never shows a button that can only fail. Offering all four while
 * three were disabled meant three of every four attempts died on "provider is
 * not enabled".
 *
 * Falls back to Google alone: a sign-in page with no social buttons at all is a
 * worse failure than one that is briefly conservative.
 */
export async function getEnabledOAuthProviders(): Promise<OAuthProvider[]> {
  return cachedPage("auth-providers", 300, async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return ["google"];
    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: anon },
        cache: "no-store",
      });
      if (!res.ok) return ["google"];
      const json = (await res.json()) as { external?: Record<string, boolean> };
      const external = json.external ?? {};
      const enabled = CANDIDATES.filter((p) => external[p]);
      return enabled.length > 0 ? enabled : ["google"];
    } catch {
      return ["google"];
    }
  });
}
