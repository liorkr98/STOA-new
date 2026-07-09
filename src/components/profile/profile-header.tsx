import Link from "next/link";
import { BadgeCheck, Users } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { compact } from "@/lib/format";
import type { Profile } from "@/lib/types";
import type { ProfileConfig } from "@/lib/editor/types";
import { themeFromConfig } from "@/lib/profile/themes";
import { Avatar } from "@/components/ui/avatar";
import { ProfileSections } from "@/components/profile/profile-sections";

const DEFAULT_SECTIONS: NonNullable<ProfileConfig["sections"]> = [
  { id: "headline", type: "headline", visible: true },
  { id: "bio", type: "bio", visible: true },
  { id: "specialties", type: "specialties", visible: true },
  { id: "social", type: "social", visible: false },
  { id: "featured", type: "featured", visible: false },
];

/**
 * Shared profile hero — used by the branding studio preview and the public
 * analyst page so WYSIWYG edits match what visitors see.
 */
export function ProfileHeader({
  profile,
  config,
  compact: isCompact = false,
  showEditLink = false,
  aside,
  className,
}: {
  profile: Pick<Profile, "display_name" | "handle" | "avatar_url" | "cover_url" | "headline" | "bio" | "verified" | "followers_count">;
  config?: ProfileConfig | null;
  compact?: boolean;
  showEditLink?: boolean;
  aside?: React.ReactNode;
  className?: string;
}) {
  const cfg = config ?? {};
  const theme = themeFromConfig(cfg);
  const sections = cfg.sections?.length ? cfg.sections : DEFAULT_SECTIONS;
  const specialties = cfg.specialties ?? [];

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface", className)}>
      {profile.cover_url && theme.banner_style === "cover" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.cover_url}
          alt=""
          className={cn("w-full object-cover", isCompact ? "h-16" : "h-28")}
        />
      ) : (
        <div className={cn("w-full", isCompact ? "h-16" : "h-28", theme.className)} />
      )}
      <div className={cn("grid gap-6", isCompact ? "px-5 pb-5" : "px-6 pb-6 lg:grid-cols-[1fr_280px]")}>
        <div className={cn("flex flex-col gap-4", isCompact ? "-mt-6" : "-mt-10")}>
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name}
            size={isCompact ? "lg" : "xl"}
            className="ring-4 ring-[var(--surface)]"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={isCompact ? "t-h3" : "t-h2"}>{profile.display_name || "Your name"}</h1>
              {profile.verified && <BadgeCheck size={20} className="text-text" aria-label="Verified" />}
            </div>
            <p className="t-meta mt-1">
              @{profile.handle || "handle"}
              {!isCompact && (
                <>
                  {" "}
                  · <Users size={13} className="inline" aria-hidden />{" "}
                  <span className="num">{compact(profile.followers_count ?? 0)}</span> followers
                </>
              )}
            </p>
            <ProfileSections
              profile={profile}
              config={{ ...cfg, specialties }}
              sections={sections}
              className="mt-3"
            />
          </div>
          {showEditLink && (
            <Link href="/studio/branding" className="text-sm text-accent hover:underline">
              Edit branding
            </Link>
          )}
        </div>
        {!isCompact && aside && <div className="flex flex-col gap-4">{aside}</div>}
      </div>
    </div>
  );
}
