import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[var(--w-standard)] items-center px-5 py-16">
      <AuthForm mode="sign-in" oauthError={error} />
    </div>
  );
}
