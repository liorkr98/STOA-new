import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { buildProfileView } from "@/lib/profile/build-profile-view";
import { AnalystProfileView } from "@/components/profile/analyst-profile-view";

export const metadata: Metadata = { title: "Your profile" };

/**
 * The default view of the owner's profile area: their public storefront exactly
 * as visitors see it, with the private sidebar alongside (supplied by the
 * (private) layout). Accounts that never published have no public page, so they
 * land on Library instead.
 */
export default async function MyProfilePage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const isAnalyst = profile.role === "analyst" || profile.role === "admin";
  if (!isAnalyst) redirect("/saved");

  const view = await buildProfileView(profile.handle);
  if (!view) redirect("/saved");

  return (
    <div className="mx-auto w-full max-w-[var(--w-wide)]">
      <AnalystProfileView {...view} />
    </div>
  );
}
