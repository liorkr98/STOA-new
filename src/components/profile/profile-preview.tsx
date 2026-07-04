"use client";

import type { Profile } from "@/lib/types";
import type { ProfileConfig } from "@/lib/editor/types";
import { ProfileHeader } from "@/components/profile/profile-header";

/** Live preview pane for the branding studio — scales down on small screens. */
export function ProfilePreview({
  profile,
  draft,
}: {
  profile: Profile;
  draft: {
    display_name: string;
    headline: string;
    bio: string;
    avatar_url: string | null;
    cover_url: string | null;
    config: ProfileConfig;
  };
}) {
  const previewProfile = {
    ...profile,
    display_name: draft.display_name || profile.display_name,
    headline: draft.headline || null,
    bio: draft.bio || null,
    avatar_url: draft.avatar_url,
    cover_url: draft.cover_url,
  };

  return (
    <div className="sticky top-6 flex flex-col gap-3">
      <p className="t-eyebrow">Live preview</p>
      <ProfileHeader profile={previewProfile} config={draft.config} compact />
      <p className="t-meta text-[11px]">
        MOAT badge, pricing, and track record are platform-controlled and always appear below this
        hero on your public page.
      </p>
    </div>
  );
}
