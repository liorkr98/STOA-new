/** Boost packages — wallet balance, fixed duration placements. */

export type BoostPackageId =
  | "profile_24h"
  | "profile_7d"
  | "report_24h"
  | "report_7d";

export type BoostPlacement = "discover_researchers" | "discover_sidebar" | "feed_trending";

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
    description: "Featured in Researchers + sidebar",
    target_type: "profile",
    placement: "discover_researchers",
    hours: 24,
    price: 5,
  },
  {
    id: "profile_7d",
    label: "Profile · 7 days",
    description: "Featured in Researchers + sidebar",
    target_type: "profile",
    placement: "discover_researchers",
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
