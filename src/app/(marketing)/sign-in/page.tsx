import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";
import { sameOriginPath } from "@/lib/pwa/urls";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string; registered?: string; next?: string }>;
}) {
  const [userId, params] = await Promise.all([getSessionUserId(), searchParams]);
  const { error, reason, registered } = params;
  const next = sameOriginPath(params.next, "") || undefined;
  if (userId) redirect(next ?? "/home");
  const providers = await getEnabledOAuthProviders();
  // Sign-up sends people here with ?registered=1 when the address still has
  // to be confirmed. It used to be read by nothing, so the page just said
  // "Welcome back" to someone who had never been here.
  const notice = registered
    ? "Check your inbox. We sent a link to confirm your address; opening it signs you in."
    : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[var(--w-standard)] items-center gutter-x py-16">
      <AuthForm
        mode="sign-in"
        oauthError={error}
        oauthReason={reason}
        notice={notice}
        providers={providers}
        next={next}
      />
    </div>
  );
}
