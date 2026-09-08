import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Set a new password" };

/**
 * Reached from the recovery email (signed in by /auth/confirm or the
 * callback) or from Settings. Someone with no session has no business here
 * and is sent to ask for a link.
 */
export default async function ResetPasswordPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/forgot-password");
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[var(--w-standard)] items-center gutter-x py-16">
      <ResetPasswordForm />
    </div>
  );
}
