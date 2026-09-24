/**
 * The three publication types, and how they map onto what the database
 * stores. See docs/COMPOSE.md.
 *
 * A type is a job, not a file format: reach strangers, stay present, or
 * prove depth. Each type stores as one value of the database's
 * `content_type` enum. The enum's fourth value, `call`, belonged to the
 * retired Verdict type; migration 0067 relabels those rows, and until it is
 * applied they read as a thesis.
 */

import type { ContentType } from "@/lib/types";

export type PublicationType = "video" | "brief" | "thesis";

export interface PublicationTypeDef {
  key: PublicationType;
  label: string;
  /** The headline on the picker: what the type is for, in the analyst's terms. */
  purpose: string;
  /** Two sentences under it. */
  detail: string;
  /** Who sees it, as a mono line. */
  seenBy: string;
}

export const PUBLICATION_TYPES: PublicationTypeDef[] = [
  {
    key: "video",
    label: "Video",
    purpose: "Reach people who don't know you",
    detail:
      "The only type that lands on the Feed and in Explore. This is how an audience finds you in the first place.",
    seenBy: "Everyone, including strangers",
  },
  {
    key: "brief",
    label: "Brief",
    purpose: "Stay present between big pieces",
    detail:
      "A short written take. Keeps the followers and subscribers you already have reading week to week.",
    seenBy: "Your followers",
  },
  {
    key: "thesis",
    label: "Thesis",
    purpose: "Prove you are worth paying for",
    detail:
      "A full written report. Depth is what converts a reader into a subscriber, and the strongest route onto Today.",
    seenBy: "Buyers and subscribers",
  },
];

export function publicationTypeDef(key: PublicationType): PublicationTypeDef {
  return PUBLICATION_TYPES.find((t) => t.key === key) ?? PUBLICATION_TYPES[0]!;
}

export function isPublicationType(raw: string | null | undefined): raw is PublicationType {
  return raw === "video" || raw === "brief" || raw === "thesis";
}

/** What the database stores for each type. */
export function contentTypeFor(type: PublicationType): ContentType {
  switch (type) {
    case "video":
      return "video";
    case "brief":
      return "short_post";
    case "thesis":
      return "research";
  }
}

/**
 * The type a stored row was made as. Older rows with no clip read as a
 * thesis, and so does a retired verdict (`call`) until 0067 relabels it.
 */
export function publicationTypeFrom(type: ContentType | null | undefined): PublicationType {
  switch (type) {
    case "short_post":
      return "brief";
    case "video":
      return "video";
    default:
      return "thesis";
  }
}

/** Clips longer than this send a Feed preview. The full clip is on Explore and profile. */
export const FEED_PREVIEW_LONG_SECONDS = 45;

export function clipPlayableSeconds(trimStart: number, trimEnd: number, durationSeconds: number): number {
  const start = Math.max(0, trimStart);
  const end = Math.min(durationSeconds, trimEnd);
  return Math.max(0, end - start);
}

/** Null means play the full clip in the Feed. */
export function feedPreviewSecondsForClip(clipSeconds: number): number | null {
  if (clipSeconds > FEED_PREVIEW_LONG_SECONDS) return FEED_PREVIEW_LONG_SECONDS;
  return null;
}

/** Hard cap on a Brief. */
export const BRIEF_MAX_CHARS = 300;

export type PublicTypeLabel = "VIDEO" | "BRIEF" | "THESIS";

/** The type as it is printed on a publication, everywhere on the site. */
export function publicTypeLabel(type: ContentType): PublicTypeLabel {
  return publicationTypeDef(publicationTypeFrom(type)).label.toUpperCase() as PublicTypeLabel;
}
