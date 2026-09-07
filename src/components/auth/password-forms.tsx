"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { AuthState } from "@/lib/types";

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus-ring";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? pendingLabel : label}
    </Button>
  );
}

/** Ask for a recovery link. The same answer whether or not the address exists. */
export function ForgotPasswordForm({ sent }: { sent: boolean }) {
  const [state, formAction] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="t-h1">Forgot your password?</h1>
      <p className="t-body mt-2">
        Enter the email you signed up with. If it has an account, a link to set a new password is on its way.
      </p>
      {sent ? (
        <p role="status" className="mt-6 rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2 text-sm text-text">
          Check your inbox. The link signs you in and opens the page to set a new password.
        </p>
      ) : (
        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input id="email" name="email" type="email" required className={inputClass} placeholder="you@example.com" />
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-[var(--down)]">
              {state.error}
            </p>
          )}
          <Submit label="Send the link" pendingLabel="Sending…" />
        </form>
      )}
      <p className="mt-6 text-sm text-text-mute">
        <Link href="/sign-in" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

/** Set a new password while signed in. */
export function ResetPasswordForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(updatePassword, null);
  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="t-h1">Set a new password</h1>
      <p className="t-body mt-2">You are signed in. Choose a new password and you are done.</p>
      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={inputClass}
            placeholder="At least 6 characters"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="confirm" className="text-sm font-medium">
            Again, to be sure
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        {state?.error && (
          <p role="alert" className="text-sm text-[var(--down)]">
            {state.error}
          </p>
        )}
        <Submit label="Save the new password" pendingLabel="Saving…" />
      </form>
    </div>
  );
}
