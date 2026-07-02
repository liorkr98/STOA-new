import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { ensureProfile } from "@/app/actions/profile";
import { CreatorOnboardingSteps } from "@/components/onboarding/creator-onboarding-steps";

export default async function CreatorOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role === "analyst" || profile.role === "admin") redirect("/studio");
  await ensureProfile();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col gap-10 py-4">
      <CreatorOnboardingSteps />
      {children}
    </div>
  );
}
