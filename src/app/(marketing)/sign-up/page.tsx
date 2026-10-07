import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";
import { sameOriginPath } from "@/lib/pwa/urls";

export const metadata: Metadata = { title: "Join Stoa" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; next?: string }>;
}) {
  const [userId, params] = await Promise.all([getSessionUserId(), searchParams]);
  const next = sameOriginPath(params.next, "") || undefined;
  if (userId) redirect(next ?? "/home");

  const { ref } = params;
  const refHandle = ref?.trim().toLowerCase().replace(/^@/, "") || undefined;
  const providers = await getEnabledOAuthProviders();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[var(--w-standard)] items-center gutter-x py-16">
      <AuthForm mode="sign-up" refHandle={refHandle} providers={providers} next={next} />
    </div>
  );
}
