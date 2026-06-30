import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="t-h1">Settings</h1>
        <p className="t-body mt-1">Update your public profile and analyst pricing.</p>
      </div>
      <ProfileSettingsForm profile={profile} />
    </div>
  );
}
