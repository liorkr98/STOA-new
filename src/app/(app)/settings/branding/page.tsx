import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { CoverUpload } from "@/components/profile/cover-upload";
import { BrandingEditor } from "@/components/profile/branding-editor";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const config = profile.profile_config ?? {};

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h1">Branding</h1>
          <p className="t-body mt-1">
            Your public storefront: avatar, cover, layout, and specialties.
          </p>
        </div>
        <Link href="/settings" className={buttonClass("secondary", "sm")}>
          Basic settings
        </Link>
      </div>

      <div className="surface flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center gap-6">
          <AvatarUpload
            userId={profile.id}
            displayName={profile.display_name}
            currentUrl={profile.avatar_url}
          />
          <div>
            <p className="font-semibold">{profile.display_name}</p>
            <p className="t-meta">@{profile.handle}</p>
            <Link
              href={`/analyst/${profile.handle}`}
              className="mt-2 inline-block text-sm text-accent hover:underline"
            >
              Preview public profile
            </Link>
          </div>
        </div>
        <CoverUpload
          userId={profile.id}
          currentUrl={profile.cover_url}
          bannerStyle={config.banner_style}
        />
      </div>

      <BrandingEditor profile={profile} />
    </div>
  );
}
