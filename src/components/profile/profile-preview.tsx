"use client";

import { useState } from "react";
import { cn } from "@/lib/design/cn";
import type { Profile } from "@/lib/types";
import type { ProfileConfig } from "@/lib/editor/types";
import { ProfileHeader } from "@/components/profile/profile-header";

type PreviewMode = "desktop" | "mobile";

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
    <div className="rounded-[var(--radius-card)] border border-border bg-bg p-3">
      <p className="t-meta mb-2 text-[10px] uppercase tracking-wide">Share preview</p>
      <div className="overflow-hidden rounded-[var(--radius-btn)] border border-border bg-surface">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-24 w-full object-cover" />
        )}
        <div className="p-3">
          <p className="line-clamp-1 text-sm font-semibold">{title}</p>
          <p className="t-meta mt-0.5 line-clamp-2 text-[12px]">{description}</p>
          <p className="t-meta mt-1 truncate text-[10px]">{url}</p>
        </div>
      </div>
    </div>
  );
}

/** Live preview pane with desktop/mobile width toggle. */
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
  const [mode, setMode] = useState<PreviewMode>("desktop");

  const previewProfile = {
    ...profile,
    display_name: draft.display_name || profile.display_name,
    headline: draft.headline || null,
    bio: draft.bio || null,
    avatar_url: draft.avatar_url,
    cover_url: draft.cover_url,
  };

  const publicUrl =
    typeof window !== "undefined" && profile.handle
      ? `${window.location.origin}/analyst/${profile.handle}`
      : `/analyst/${profile.handle}`;

  return (
    <div className="sticky top-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="t-eyebrow">Live preview</p>
        <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-bg p-0.5 text-[11px]">
          {(["desktop", "mobile"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-[4px] px-2 py-0.5 font-medium capitalize",
                mode === m ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "mx-auto w-full transition-[max-width]",
          mode === "mobile" ? "max-w-[320px]" : "max-w-full",
        )}
      >
        <ProfileHeader profile={previewProfile} config={draft.config} compact={mode === "mobile"} />
      </div>

      <ShareLinkPreview
        title={previewProfile.display_name}
        description={previewProfile.headline || previewProfile.bio || "Analyst on Stoa"}
        url={publicUrl}
        imageUrl={previewProfile.cover_url || previewProfile.avatar_url}
      />

      <p className="t-meta text-[11px]">
        Pricing and your call record are platform-controlled and always appear below this hero on
        your public page.
      </p>
    </div>
  );
}
