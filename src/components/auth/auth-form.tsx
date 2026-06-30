"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/app/actions/profile";
import { buttonClass } from "@/components/ui/button";

const inputClass =
  "h-11 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 text-sm text-text placeholder:text-text-faint focus-ring";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("display_name") ?? "");

    start(async () => {
      const supabase = createClient();

      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
      }

      await ensureProfile();

      router.push("/discover");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="t-h1">{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
      <p className="t-body mt-2">
        {mode === "sign-in"
          ? "Sign in to follow analysts and manage your subscriptions."
          : "Start with 100 demo credits to explore the marketplace."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
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

        {error && (
          <p className="rounded-[var(--radius-btn)] border border-[var(--down)]/30 bg-[var(--down)]/10 px-3 py-2 text-sm text-[var(--down)]">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
          {pending ? "One moment..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
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
