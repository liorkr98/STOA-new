"use client";

import { FeedSurface } from "@/components/feed/feed-surface";
import { fixturePublications } from "@/lib/dev/feed-fixtures";
import type { FeedComment } from "@/lib/feed/types";

/**
 * Dev-only Feed: the real surface over 30 fictional publications. The
 * first items put a call (with sealed locked cards and a locked Steelman)
 * beside a callless NOTE (theme chip, no ticker, no seal) and a resolved call
 * with its seal, so both anchoring styles and both Steelman states are visible.
 * Posting a comment appends locally.
 */
export default function DevFeedPage() {
  const pubs = fixturePublications();
  const order = ["x1", "x3", "x6", "x2", "x4", "x7", ...pubs.map((p) => p.id)];
  const seen = new Set<string>();
  const ordered = order.map((id) => pubs.find((p) => p.id === id)!).filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  const onPost = async (reportId: string, text: string, parentId: string | null): Promise<FeedComment | null> => ({
    id: `local-${Math.random().toString(36).slice(2, 8)}`,
    parentId,
    author: { handle: "you", displayName: "You", avatarUrl: null, isAuthor: false },
    createdAt: new Date().toISOString(),
    text,
    likes: 0,
  });
  return <FeedSurface publications={ordered} canAct onPost={onPost} />;
}
