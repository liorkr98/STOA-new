import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");
  const { error, reason } = await searchParams;
  const providers = await getEnabledOAuthProviders();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[var(--w-standard)] items-center gutter-x py-16">
      <AuthForm mode="sign-in" oauthError={error} oauthReason={reason} providers={providers} />
    </div>
  );
}
