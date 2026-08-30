"use client";

import { ExploreWall } from "@/components/explore/explore-wall";
import type { ExploreTile } from "@/lib/explore/wall";
import type { FeedComment } from "@/lib/feed/types";

export function DevExploreWall(props: {
  tiles: ExploreTile[];
  tickers: string[];
  sectors: string[];
  ticker: string | null;
  sector: string | null;
  dateline: string;
}) {
  const onPost = async (_reportId: string, text: string, parentId: string | null): Promise<FeedComment | null> => ({
    id: `local-${Math.random().toString(36).slice(2, 8)}`,
    parentId,
    author: { handle: "you", displayName: "You", avatarUrl: null, isAuthor: false },
    createdAt: new Date().toISOString(),
    text,
    likes: 0,
  });

  return <ExploreWall {...props} basePath="/dev/explore" canAct canWatch onPost={onPost} />;
}
