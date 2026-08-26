/**
 * Compose formats. Call is not a format: it is an optional locked prediction
 * on Video, Research, or Post. See docs/COMPOSE.md.
 */

import type { ContentType } from "@/lib/types";

export type ComposeMode = "video" | "research" | "short_post";

export const COMPOSE_MODES: { key: ComposeMode; label: string }[] = [
  { key: "video", label: "Video" },
  { key: "research", label: "Research" },
  { key: "short_post", label: "Post" },
];

/** Long clips send this many seconds to the Feed. The rest lives on the page. */
export const FEED_PREVIEW_LONG_SECONDS = 45;

/** Hard cap on a Post. */
export const POST_MAX_CHARS = 300;

export function modeFromType(type: ContentType | null | undefined): ComposeMode {
  if (type === "short_post") return "short_post";
  if (type === "research") return "research";
  return "video";
}

export function typeFromMode(mode: ComposeMode): ContentType {
  if (mode === "short_post") return "short_post";
  if (mode === "research") return "research";
  return "video";
}

export type PublicTypeLabel = "CALL" | "RESEARCH" | "NOTE" | "VIDEO";

export function publicTypeLabel(type: ContentType): PublicTypeLabel {
  if (type === "research") return "RESEARCH";
  if (type === "short_post") return "NOTE";
  if (type === "video") return "VIDEO";
  return "CALL";
}
