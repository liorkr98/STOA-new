import type { ProfileConfig } from "@/lib/editor/types";

export type ProfileThemeId =
  | "signal"
  | "cool"
  | "minimal"
  | "warm"
  | "slate"
  | "cover";

export interface ProfileTheme {
  id: ProfileThemeId;
  label: string;
  banner_style: NonNullable<ProfileConfig["banner_style"]>;
  className: string;
}

/** Six curated storefront themes — accent pairings within the Stoa design system. */
export const PROFILE_THEMES: ProfileTheme[] = [
  {
    id: "signal",
    label: "Signal",
    banner_style: "gradient-accent",
    className: "bg-gradient-to-r from-accent/25 via-accent/10 to-transparent",
  },
  {
    id: "cool",
    label: "Cool",
    banner_style: "gradient-cool",
    className: "bg-gradient-to-r from-[var(--ink)] via-accent/20 to-transparent",
  },
  {
    id: "minimal",
    label: "Minimal",
    banner_style: "minimal",
    className: "bg-gradient-to-r from-surface-2 to-bg",
  },
  {
    id: "warm",
    label: "Warm",
    banner_style: "gradient-accent",
    className: "bg-gradient-to-r from-[color-mix(in_srgb,var(--rust)_22%,transparent)] via-accent/8 to-transparent",
  },
  {
    id: "slate",
    label: "Slate",
    banner_style: "minimal",
    className: "bg-gradient-to-br from-[var(--ink)]/90 via-[var(--ink)]/40 to-transparent",
  },
  {
    id: "cover",
    label: "Cover",
    banner_style: "cover",
    className: "",
  },
];

export function themeById(id: string | undefined): ProfileTheme {
  return PROFILE_THEMES.find((t) => t.id === id) ?? PROFILE_THEMES[0];
}

export function themeFromConfig(config: ProfileConfig | null | undefined): ProfileTheme {
  if (config?.theme_id) return themeById(config.theme_id);
  const style = config?.banner_style ?? "gradient-accent";
  return PROFILE_THEMES.find((t) => t.banner_style === style && t.id !== "warm") ?? PROFILE_THEMES[0];
}
