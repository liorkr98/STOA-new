"use client";

import { useState } from "react";
import { FeedPlayer } from "@/components/feed/feed-player";
import { FeedDiscussion } from "@/components/feed/feed-discussion";
import type { FeedComment, FeedPublication } from "@/lib/feed/types";

/**
 * The Feed as a page: the framed video stage with the publication's cards,
 * vertical navigation between publications, and the discussion beneath.
 * Comments arrive with the publication; posting goes through the server
 * action when the reader is signed in.
 */
export function FeedPage({
  publications,
  canPost,
  onPost,
}: {
  publications: FeedPublication[];
  canPost: boolean;
  onPost?: (reportId: string, text: string, parentId: string | null) => Promise<FeedComment | null>;
}) {
  const [extra, setExtra] = useState<Record<string, FeedComment[]>>({});
  return (
    <FeedPlayer
      publications={publications}
      mode="page"
      below={(pub) => (
        <FeedDiscussion
          comments={[...(extra[pub.id] ?? []), ...pub.comments]}
          canPost={canPost}
          onPost={
            onPost
              ? async (text, parentId) => {
                  const posted = await onPost(pub.id, text, parentId);
                  if (posted) setExtra((e) => ({ ...e, [pub.id]: [posted, ...(e[pub.id] ?? [])] }));
                }
              : undefined
          }
        />
      )}
    />
  );
}
