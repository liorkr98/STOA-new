"use client";

import type { Profile } from "@/lib/types";
import { StorefrontHero } from "@/components/profile/analyst-profile-view";
import { buttonClass } from "@/components/ui/button";
import { compact } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo/site";

function ShareLinkPreview({
  title,
  description,
  url,
  imageUrl,
}: {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
}) {
  return (
    <div className="rounded-panel border border-border bg-bg p-3">
      <p className="t-meta mb-2 text-ticker">Share preview</p>
      <div className="overflow-hidden rounded-inner border border-border bg-surface">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-24 w-full object-cover" />
        )}
        <div className="p-3">
          <p className="line-clamp-1 text-body font-semibold">{title}</p>
          <p className="t-meta mt-0.5 line-clamp-2 text-ticker">{description}</p>
          <p className="t-meta mt-1 truncate text-ticker">{url}</p>
        </div>
      </div>
    </div>
  );
}

/** Live preview: the storefront hero as visitors see it, and the link card a share produces. */
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

  // The canonical origin, which the server and the browser agree on. Reading
  // window.location.origin here rendered a bare path on the server and a
  // full URL in the browser, and React reported the mismatch on every open.
  const publicUrl = absoluteUrl(`/analyst/${profile.handle}`);

  return (
    <div className="flex flex-col gap-3">
      <p className="t-meta">Live preview</p>

      <div>
        <div className="rounded-panel border border-border bg-bg p-5">
          <StorefrontHero
            compact
            name={previewProfile.display_name || "Your name"}
            avatarUrl={previewProfile.avatar_url}
            verified={previewProfile.verified}
            specialty={previewProfile.headline?.trim() || "Independent analyst on Stoa"}
            bio={previewProfile.bio}
            audienceLine={`@${profile.handle} · ${compact(profile.followers_count ?? 0)} followers`}
            actions={
              <div aria-hidden className="pointer-events-none flex w-full flex-wrap gap-2.5">
                <span className={buttonClass("coral", "lg", "w-full")}>Subscribe</span>
                <span className={buttonClass("ghost", "lg", "flex-1")}>Follow</span>
                <span className={buttonClass("ghost", "lg", "flex-1")}>Share</span>
              </div>
            }
          />
        </div>
      </div>

      <ShareLinkPreview
        title={previewProfile.display_name}
        description={previewProfile.headline || previewProfile.bio || "Analyst on Stoa"}
        url={publicUrl}
        imageUrl={previewProfile.cover_url || previewProfile.avatar_url}
      />
    </div>
  );
}
