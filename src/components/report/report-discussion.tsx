"use client";

import { postFeedComment } from "@/app/actions/feed";
import { DiscussionThread } from "@/components/discussion/discussion-thread";
import type { FeedComment } from "@/lib/feed/types";

/** The publication page's discussion: the shared thread, bound to this report. */
export function ReportDiscussion({
  reportId,
  comments,
  canPost,
}: {
  reportId: string;
  comments: FeedComment[];
  canPost: boolean;
}) {
  return (
    <DiscussionThread
      variant="page"
      comments={comments}
      canPost={canPost}
      actions={{ post: (text, parentId) => postFeedComment(reportId, text, parentId) }}
    />
  );
}
