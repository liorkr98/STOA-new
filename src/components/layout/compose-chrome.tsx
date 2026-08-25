"use client";

import { usePathname } from "next/navigation";

/**
 * Compose owns its own rails.
 *
 * The private area puts profile navigation down the left and a group nav
 * across the top of the content. Neither is a tool for making a publication,
 * and on Compose the left edge belongs to the toolbox: the deck and the
 * assistant. Wrapping the slot rather than hiding it in CSS also drops the
 * streaming fallback, which would otherwise hold a 240px empty rail open
 * beside the workspace while the profile loaded.
 */
export function HideOnCompose({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/studio/compose")) return null;
  return <>{children}</>;
}
