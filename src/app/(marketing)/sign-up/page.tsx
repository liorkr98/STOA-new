import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Join Stoa" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");

  const { ref } = await searchParams;
  const refHandle = ref?.trim().toLowerCase().replace(/^@/, "") || undefined;
  const providers = await getEnabledOAuthProviders();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[var(--w-standard)] items-center gutter-x py-16">
      <AuthForm mode="sign-up" refHandle={refHandle} providers={providers} />
    </div>
  );
}
