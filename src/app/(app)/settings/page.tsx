import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h1">Settings</h1>
          <p className="t-body mt-1">Update your public profile and analyst pricing.</p>
        </div>
        <Link href="/settings/branding" className={buttonClass("primary", "sm")}>
          Branding studio
        </Link>
      </div>
      <ProfileSettingsForm profile={profile} />
    </div>
  );
}
