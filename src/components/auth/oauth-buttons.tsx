"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/design/cn";
import { sameOriginPath } from "@/lib/pwa/urls";
import type { OAuthProvider as Provider } from "@/lib/auth/providers";

/**
 * Social sign-in via Supabase OAuth. Only providers the project has actually
 * enabled are rendered (`enabled`, read from the project's auth settings), so a
 * button can never be offered that is only capable of failing. Session lands
 * through /auth/callback which ensures the profile row exists.
 */

const PROVIDERS: { key: Provider; label: string; icon: React.ReactNode }[] = [
  {
    key: "google",
    label: "Google",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">
        <path d="M21.35 11.1h-9.17v2.96h5.3c-.23 1.24-.93 2.29-1.98 3l3.2 2.48c1.87-1.72 2.95-4.26 2.95-7.28 0-.4-.03-.78-.1-1.16z" />
        <path d="M12.18 22c2.67 0 4.9-.88 6.53-2.4l-3.2-2.48c-.89.6-2.03.95-3.33.95-2.56 0-4.73-1.73-5.5-4.06H3.37v2.55A9.82 9.82 0 0 0 12.18 22z" />
        <path d="M6.68 14.01a5.9 5.9 0 0 1 0-3.77V7.69H3.37a9.83 9.83 0 0 0 0 8.87l3.31-2.55z" />
        <path d="M12.18 6.18c1.45 0 2.75.5 3.77 1.48l2.83-2.83C17.07 3.19 14.85 2.25 12.18 2.25a9.82 9.82 0 0 0-8.81 5.44l3.31 2.55c.77-2.33 2.94-4.06 5.5-4.06z" />
      </svg>
    ),
  },
  {
    key: "apple",
    label: "Apple",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">
        <path d="M16.36 12.99c-.02-2.13 1.74-3.15 1.82-3.2-.99-1.45-2.53-1.65-3.08-1.67-1.31-.13-2.56.77-3.22.77-.66 0-1.69-.75-2.78-.73-1.43.02-2.75.83-3.49 2.11-1.49 2.58-.38 6.4 1.07 8.49.71 1.03 1.55 2.18 2.66 2.14 1.07-.04 1.47-.69 2.76-.69s1.65.69 2.78.67c1.15-.02 1.88-1.04 2.58-2.07.81-1.19 1.15-2.34 1.17-2.4-.03-.01-2.24-.86-2.27-3.42z" />
        <path d="M14.24 6.74c.59-.71.99-1.7.88-2.69-.85.03-1.88.57-2.49 1.28-.55.63-1.03 1.64-.9 2.6.95.07 1.92-.48 2.51-1.19z" />
      </svg>
    ),
  },
  {
    key: "linkedin_oidc",
    label: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
      </svg>
    ),
  },
  {
    key: "twitter",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden fill="currentColor">
        <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z" />
      </svg>
    ),
  },
];

export function OAuthButtons({
  next = "/home",
  refHandle,
  enabled,
}: {
  next?: string;
  refHandle?: string;
  enabled?: Provider[];
}) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allow = enabled ?? ["google"];
  const visible = PROVIDERS.filter((p) => allow.includes(p.key));

  async function signInWith(provider: Provider) {
    setPending(provider);
    setError(null);
    const supabase = createClient();
    const params = new URLSearchParams({ next: sameOriginPath(next, "/home") });
    if (refHandle) params.set("ref", refHandle);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?${params.toString()}`,
      },
    });
    if (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes("invalid_client") || msg.includes("provider is not enabled")) {
        setError(
          provider === "google"
            ? "Google sign-in is misconfigured. In Supabase → Authentication → Providers → Google, paste a valid OAuth Client ID and Secret from Google Cloud Console. The redirect URI in Google must be your Supabase callback URL (…/auth/v1/callback)."
            : `${PROVIDERS.find((p) => p.key === provider)?.label ?? provider} sign-in is not configured in Supabase yet.`,
        );
      } else {
        setError(err.message);
      }
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("grid gap-2", visible.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {visible.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={pending !== null}
            onClick={() => void signInWith(p.key)}
            className={cn(
              "focus-ring flex h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)]",
              "border border-border bg-surface text-sm font-medium text-text",
              "transition-colors hover:border-border-strong hover:bg-surface-2 disabled:opacity-60",
            )}
          >
            {p.icon}
            {pending === p.key ? "Redirecting..." : p.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-[var(--down)]">{error}</p>}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="t-meta text-[11px]">or with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
