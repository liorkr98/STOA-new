import Link from "next/link";
import { cn } from "@/lib/design/cn";
import type { Profile } from "@/lib/types";
import type { ProfileConfig, ProfileSection } from "@/lib/editor/types";

/**
 * Renders profile content blocks in the order saved by the branding studio.
 */
export function ProfileSections({
  profile,
  config,
  sections,
  className,
}: {
  profile: Pick<Profile, "headline" | "bio">;
  config: ProfileConfig;
  sections: ProfileSection[];
  className?: string;
}) {
  const specialties = config.specialties ?? [];
  const social = config.social ?? [];
  const tickers = config.featured_tickers ?? [];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {sections
        .filter((s) => s.visible)
        .map((section) => {
          if (section.type === "headline" && profile.headline) {
            return (
              <p key={section.id} className="t-body">
                {profile.headline}
              </p>
            );
          }
          if (section.type === "bio" && profile.bio) {
            return (
              <p key={section.id} className="t-body text-text-mute">
                {profile.bio}
              </p>
            );
          }
          if (section.type === "specialties" && specialties.length > 0) {
            return (
              <div key={section.id} className="flex flex-wrap gap-2">
                {specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-[var(--radius-tag)] border border-border bg-bg px-2 py-0.5 text-xs text-text-mute"
                  >
                    {s}
                  </span>
                ))}
              </div>
            );
          }
          if (section.type === "social" && social.length > 0) {
            return (
              <div key={section.id} className="flex flex-wrap gap-2">
                {social.map((link) => (
                  <a
                    key={`${link.label}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[var(--radius-tag)] border border-border bg-bg px-2.5 py-1 text-xs font-medium text-accent hover:border-accent/40"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            );
          }
          if (section.type === "featured" && tickers.length > 0) {
            return (
              <div key={section.id} className="flex flex-wrap items-center gap-2">
                <span className="t-meta text-[11px]">Watching</span>
                {tickers.map((t) => (
                  <Link
                    key={t}
                    href={`/markets/${t}`}
                    className="num rounded-[var(--radius-tag)] border border-border bg-bg px-2 py-0.5 text-xs font-semibold hover:border-accent/40"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            );
          }
          return null;
        })}
    </div>
  );
}
