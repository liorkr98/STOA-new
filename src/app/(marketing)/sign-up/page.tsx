import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Join Stoa" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const userId = await getSessionUserId();
  if (userId) redirect("/discover");

  const { ref } = await searchParams;
  const refHandle = ref?.trim().toLowerCase().replace(/^@/, "") || undefined;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[1200px] items-center px-5 py-16">
      <AuthForm mode="sign-up" refHandle={refHandle} />
    </div>
  );
}
