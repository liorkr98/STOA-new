"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Spinner } from "@phosphor-icons/react";
import { Button, buttonClass } from "@/components/ui/button";
import { StorefrontHero } from "@/components/profile/analyst-profile-view";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { checkHandleAvailable, saveOnboardingBrand } from "@/app/actions/profile";
import type { Profile } from "@/lib/types";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function BrandStep({ profile }: { profile: Profile }) {
  const [handle, setHandle] = useState(profile.handle);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  // Only the server's answer is stored; idle, invalid and checking all follow
  // from the handle itself, so they are worked out during render.
  const [checked, setChecked] = useState<{ handle: string; ok: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const clean = handle.trim().toLowerCase();
  const isOwnHandle = clean === profile.handle;
  const isWellFormed = HANDLE_RE.test(clean);

  const availability: Availability = isOwnHandle
    ? "idle"
    : !isWellFormed
      ? "invalid"
      : checked?.handle === clean
        ? checked.ok
          ? "available"
          : "taken"
        : "checking";

  useEffect(() => {
    if (isOwnHandle || !isWellFormed) return;
    const timer = setTimeout(() => {
      void checkHandleAvailable(clean).then((ok) => setChecked({ handle: clean, ok }));
    }, 400);
    return () => clearTimeout(timer);
  }, [clean, isOwnHandle, isWellFormed]);

  const handleValid = availability === "idle" || availability === "available";
  const canContinue = handleValid && displayName.trim().length > 0 && !pending;

  function onContinue() {
    setError(null);
    start(async () => {
      const res = await saveOnboardingBrand({
        handle,
        display_name: displayName,
        bio,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/onboarding/analyst/price");
    });
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <AvatarUpload
          userId={profile.id}
          displayName={displayName || profile.display_name}
          currentUrl={avatarUrl}
          onUploaded={setAvatarUrl}
        />

        <label className="flex flex-col gap-1.5 text-body">
          <span className="font-medium">Handle</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-mute">@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              className="h-11 w-full rounded-field border border-border bg-bg pl-7 pr-9 text-body focus-ring"
              maxLength={20}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {availability === "checking" && <Spinner size={16} className="animate-spin text-text-mute" />}
              {availability === "available" && <Check size={16} className="text-[var(--ok)]" />}
              {(availability === "taken" || availability === "invalid") && (
                <X size={16} className="text-[var(--error)]" />
              )}
            </span>
          </div>
          {availability === "taken" && <span className="text-ticker text-[var(--error)]">That handle is taken.</span>}
          {availability === "invalid" && (
            <span className="text-ticker text-[var(--error)]">3-20 characters: letters, numbers, underscore.</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-body">
          <span className="font-medium">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-11 w-full rounded-field border border-border bg-bg px-3 text-body focus-ring"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-body">
          <div className="flex items-center justify-between">
            <span className="font-medium">One-line bio</span>
            <span className="t-meta">{bio.length}/140</span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 140))}
            rows={2}
            placeholder="What you cover and how you think"
            className="w-full resize-none rounded-field border border-border bg-bg px-3 py-2.5 text-body focus-ring"
          />
        </label>


        {error && (
          <p className="rounded-inner border border-[var(--error-edge)] bg-[var(--error-soft)] px-3 py-2 text-body text-[var(--error)]">
            {error}
          </p>
        )}

        <Button size="lg" disabled={!canContinue} onClick={onContinue}>
          {pending ? "Saving..." : "Continue"}
        </Button>
      </div>

      <div>
        <p className="t-meta mb-2">Live preview</p>
        <div className="rounded-panel bg-surface-2 p-5">
          <StorefrontHero
            compact
            name={displayName || "Your name"}
            avatarUrl={avatarUrl}
            verified={false}
            specialty={profile.headline?.trim() || "Independent analyst on Stoa"}
            bio={bio || null}
            audienceLine={`@${handle || "handle"}`}
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
    </div>
  );
}
