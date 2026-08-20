"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import type { Profile } from "@/lib/types";

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring";

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const isAnalyst = profile.role === "analyst" || profile.role === "admin";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaved(false);
    start(async () => {
      await updateProfile(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-6">
      {/* Avatar — Settings is the single place identity (name, bio, headline, photo) is edited. */}
      <AvatarUpload
        userId={profile.id}
        displayName={profile.display_name}
        currentUrl={profile.avatar_url}
      />

      <label className="flex flex-col gap-1 text-sm">
        Display name
        <input name="display_name" defaultValue={profile.display_name} required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Bio
        <textarea
          name="bio"
          defaultValue={profile.bio ?? ""}
          rows={4}
          maxLength={500}
          placeholder="A short bio for your profile"
          className={cn(inputClass, "resize-none")}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Headline
        <input
          name="headline"
          defaultValue={profile.headline ?? ""}
          maxLength={160}
          placeholder="What you cover and how you invest"
          className={inputClass}
        />
      </label>

      <div className="text-sm">
        <span className="text-text-mute">Handle: </span>
        <span className="num">@{profile.handle}</span>
        <span className="num ml-2 text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Locked after onboarding
        </span>
      </div>

      {isAnalyst && (
        <p className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Pricing and storefront design live in Storefront.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--up)]">
            <CheckCircle size={16} weight="fill" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
