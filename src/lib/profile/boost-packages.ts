/** Boost packages — wallet balance, fixed duration placements. */

export type BoostPackageId =
  | "profile_24h"
  | "profile_7d"
  | "report_24h"
  | "report_7d";

/**
 * Named for what is promoted, not for the page it used to sit on. The two
 * analyst placements were `discover_researchers` and `discover_sidebar`, and
 * the Researchers tab they referred to went with Discover. Renaming is free:
 * the `boosts` table has never been migrated, so no stored row carries the old
 * values. Nothing renders the analyst placements today; they are kept because
 * the packages are priced and sold against them.
 */
export type BoostPlacement = "analyst_featured" | "analyst_sidebar" | "feed_trending";

export interface BoostPackage {
  id: BoostPackageId;
  label: string;
  description: string;
  target_type: "profile" | "report";
  placement: BoostPlacement;
  hours: number;
  price: number;
}

export const BOOST_PACKAGES: BoostPackage[] = [
  {
    id: "profile_24h",
    label: "Profile · 24 hours",
    description: "Featured analyst slot + sidebar",
    target_type: "profile",
    placement: "analyst_featured",
    hours: 24,
    price: 5,
  },
  {
    id: "profile_7d",
    label: "Profile · 7 days",
    description: "Featured analyst slot + sidebar",
    target_type: "profile",
    placement: "analyst_featured",
    hours: 168,
    price: 15,
  },
  {
    id: "report_24h",
    label: "Report · 24 hours",
    description: "Promoted slot in Trending feed",
    target_type: "report",
    placement: "feed_trending",
    hours: 24,
    price: 8,
  },
  {
    id: "report_7d",
    label: "Report · 7 days",
    description: "Promoted slot in Trending feed",
    target_type: "report",
    placement: "feed_trending",
    hours: 168,
    price: 20,
  },
];

export function boostPackage(id: string): BoostPackage | undefined {
  return BOOST_PACKAGES.find((p) => p.id === id);
}
