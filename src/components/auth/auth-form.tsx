"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp } from "@/app/actions/auth";
import type { AuthState } from "@/lib/types";
import { buttonClass } from "@/components/ui/button";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
      {pending ? "One moment..." : label}
    </button>
  );
}

const inputClass =
  "h-11 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 text-sm text-text placeholder:text-text-mute focus-ring";

export function AuthForm({
  mode,
  refHandle,
  oauthError,
}: {
  mode: "sign-in" | "sign-up";
  refHandle?: string;
  oauthError?: string | null;
}) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction] = useActionState<AuthState, FormData>(action, null);

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="t-h1">{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
      <p className="t-body mt-2">
        {mode === "sign-in"
          ? "Sign in to follow analysts and manage your subscriptions."
          : "Follow analysts, unlock research, and build your reading list."}
      </p>

      <div className="mt-8">
        {oauthError === "oauth" && (
          <p
            role="alert"
            className="mb-4 rounded-[var(--radius-btn)] border border-[var(--down)]/30 bg-[var(--down)]/10 px-3 py-2 text-sm text-[var(--down)]"
          >
            Sign-in was cancelled or failed. If Google showed &ldquo;invalid_client&rdquo;, fix the
            Client ID and Secret under Supabase → Authentication → Providers → Google.
          </p>
        )}
        <OAuthButtons refHandle={refHandle} />
      </div>

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        {refHandle && <input type="hidden" name="ref" value={refHandle} />}
        {mode === "sign-up" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="display_name" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="display_name"
              name="display_name"
              required
              className={inputClass}
              placeholder="Jordan Mercer"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className={inputClass}
            placeholder="At least 6 characters"
          />
        </div>

        {state?.error && (
          <p
            role="alert"
            id="auth-error"
            aria-live="polite"
            className="rounded-[var(--radius-btn)] border border-[var(--down)]/30 bg-[var(--down)]/10 px-3 py-2 text-sm text-[var(--down)]"
          >
            {state.error}
          </p>
        )}

        {mode === "sign-up" && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="legal_consent"
                required
                className="mt-0.5 h-4 w-4 rounded border-border focus-ring"
                aria-describedby="legal-consent-signup"
              />
              <span id="legal-consent-signup">
                I agree to the{" "}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="age_attestation"
                required
                className="mt-0.5 h-4 w-4 rounded border-border focus-ring"
                aria-describedby="age-signup"
              />
              <span id="age-signup">I am 18 years of age or older</span>
            </label>
          </div>
        )}

        <SubmitButton label={mode === "sign-in" ? "Sign in" : "Create account"} />
      </form>

      <p className="mt-6 text-sm text-text-mute">
        {mode === "sign-in" ? (
          <>
            New to Stoa?{" "}
            <Link href="/sign-up" className="text-accent hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-accent hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
