"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { updateProfile } from "@/app/actions/profile";
import { Button, buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import type { Profile } from "@/lib/types";

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring";

function initialsOf(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

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
      {/* Avatar (upload not wired to storage yet -- placeholder). */}
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-full bg-[var(--ink)] font-display text-lg text-[var(--paper)]">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
          ) : (
            initialsOf(profile.display_name)
          )}
        </span>
        <button type="button" disabled className={buttonClass("secondary", "sm")}>
          Change photo
        </button>
      </div>

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
