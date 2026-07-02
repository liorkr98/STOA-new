"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Spinner } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { checkHandleAvailable, saveOnboardingBrand } from "@/app/actions/profile";
import type { Profile } from "@/lib/types";
import type { ProfileConfig } from "@/lib/editor/types";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";
type BannerStyle = NonNullable<ProfileConfig["banner_style"]>;

const BANNER_OPTIONS: { value: BannerStyle; label: string; className: string }[] = [
  { value: "gradient-accent", label: "Signal", className: "bg-gradient-to-r from-accent/25 via-accent/10 to-transparent" },
  { value: "gradient-cool", label: "Cool", className: "bg-gradient-to-r from-[var(--ink)] via-accent/20 to-transparent" },
  { value: "minimal", label: "Minimal", className: "bg-gradient-to-r from-surface-2 to-bg" },
];

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function BrandStep({ profile }: { profile: Profile }) {
  const [handle, setHandle] = useState(profile.handle);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [bannerStyle, setBannerStyle] = useState(profile.profile_config?.banner_style ?? "gradient-accent");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [availability, setAvailability] = useState<Availability>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const clean = handle.trim().toLowerCase();
    if (clean === profile.handle) {
      setAvailability("idle");
      return;
    }
    if (!HANDLE_RE.test(clean)) {
      setAvailability("invalid");
      return;
    }
    setAvailability("checking");
    debounceRef.current = setTimeout(() => {
      checkHandleAvailable(clean).then((ok) => setAvailability(ok ? "available" : "taken"));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  const bannerClass = BANNER_OPTIONS.find((b) => b.value === bannerStyle)?.className ?? BANNER_OPTIONS[0].className;
  const handleValid = availability === "idle" || availability === "available";
  const canContinue = handleValid && displayName.trim().length > 0 && !pending;

  function onContinue() {
    setError(null);
    start(async () => {
      const res = await saveOnboardingBrand({
        handle,
        display_name: displayName,
        bio,
        banner_style: bannerStyle,
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

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Handle</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              className="h-11 w-full rounded-[var(--radius-btn)] border border-border bg-bg pl-7 pr-9 text-sm focus-ring"
              maxLength={20}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {availability === "checking" && <Spinner size={16} className="animate-spin text-text-faint" />}
              {availability === "available" && <Check size={16} className="text-[var(--up)]" />}
              {(availability === "taken" || availability === "invalid") && (
                <X size={16} className="text-[var(--down)]" />
              )}
            </span>
          </div>
          {availability === "taken" && <span className="text-xs text-[var(--down)]">That handle is taken.</span>}
          {availability === "invalid" && (
            <span className="text-xs text-[var(--down)]">3-20 characters: letters, numbers, underscore.</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-11 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 text-sm focus-ring"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">One-line bio</span>
            <span className="t-meta">{bio.length}/140</span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 140))}
            rows={2}
            placeholder="What you cover and how you think"
            className="w-full resize-none rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2.5 text-sm focus-ring"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Banner style</span>
          <div className="flex gap-2">
            {BANNER_OPTIONS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBannerStyle(b.value)}
                className={cn(
                  "flex-1 rounded-[var(--radius-btn)] border px-3 py-2 text-xs font-medium transition-colors",
                  bannerStyle === b.value
                    ? "border-accent text-accent"
                    : "border-border text-text-mute hover:border-border-strong",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-[var(--radius-btn)] border border-[var(--down)]/30 bg-[var(--down)]/10 px-3 py-2 text-sm text-[var(--down)]">
            {error}
          </p>
        )}

        <Button size="lg" disabled={!canContinue} onClick={onContinue}>
          {pending ? "Saving..." : "Continue"}
        </Button>
      </div>

      <div>
        <p className="t-eyebrow mb-2">Live preview</p>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          <div className={cn("h-16 w-full", bannerClass)} />
          <div className="-mt-6 flex flex-col gap-3 px-5 pb-5">
            <Avatar src={avatarUrl} name={displayName || "?"} size="lg" className="ring-4 ring-[var(--surface)]" />
            <div>
              <p className="t-h3">{displayName || "Your name"}</p>
              <p className="t-meta mt-0.5">@{handle || "handle"}</p>
              {bio && <p className="t-body mt-2 text-sm text-text-mute">{bio}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
