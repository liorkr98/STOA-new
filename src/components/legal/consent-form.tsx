"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { acceptConsents } from "@/app/actions/consent";
import { buttonClass } from "@/components/ui/button";
import type { LegalDocType } from "@/lib/legal/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
      {pending ? "Saving..." : "Continue"}
    </button>
  );
}

const inputClass =
  "h-4 w-4 rounded border-border text-accent focus-ring";

export function ConsentForm({
  pendingTypes,
  requireAge,
}: {
  pendingTypes: LegalDocType[];
  requireAge: boolean;
}) {
  const [state, formAction] = useActionState(acceptConsents, null);

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="t-h1">Review and accept</h1>
      <p className="t-body mt-2 text-text-mute">
        Our terms or privacy policy have been updated, or your account needs a recorded acceptance
        before you can continue.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-5">
        {pendingTypes.includes("terms") && (
          <input type="hidden" name="needs_terms" value="1" />
        )}
        {pendingTypes.includes("privacy") && (
          <input type="hidden" name="needs_privacy" value="1" />
        )}

        {(pendingTypes.includes("terms") || pendingTypes.includes("privacy")) && (
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="legal_consent"
              required
              className={inputClass}
              aria-describedby="legal-consent-desc"
            />
            <span id="legal-consent-desc">
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
        )}

        {requireAge && (
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="age_attestation"
              required
              className={inputClass}
              aria-describedby="age-desc"
            />
            <span id="age-desc">I am 18 years of age or older</span>
          </label>
        )}

        {state?.error && (
          <p role="alert" className="text-sm text-[var(--down)]" id="consent-error">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
