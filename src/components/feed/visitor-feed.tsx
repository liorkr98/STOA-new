"use client";

import Link from "next/link";
import { FeedSurface } from "@/components/feed/feed-surface";
import { buttonClass } from "@/components/ui/button";
import type { FeedPublication } from "@/lib/feed/types";

const NEXT = encodeURIComponent("/feed");

/**
 * What a visitor meets after their free videos: one line, Join Stoa, and a
 * quiet Log in. Both come back to the Feed.
 */
export function FeedWall() {
  return (
    <div className="flex w-full max-w-[420px] flex-col items-center gap-6 rounded-panel border border-border bg-surface px-8 py-10 text-center">
      <p className="text-balance font-display text-headline font-extrabold leading-[1.08] tracking-[-0.03em] text-text">
        Join Stoa to keep watching.
      </p>
      <div className="flex items-center gap-2">
        <Link href={`/sign-up?next=${NEXT}`} className={buttonClass("coral", "lg")}>
          Join Stoa
        </Link>
        <Link href={`/sign-in?next=${NEXT}`} className={buttonClass("plain", "lg")}>
          Log in
        </Link>
      </div>
    </div>
  );
}

function stay() {}

/**
 * The Feed for a signed-out visitor: the few publications the server sent,
 * then the wall where the next one would be. A clip that plays through moves
 * on by itself, so the third one hands over to the wall.
 */
export function VisitorFeed({ publications, startIndex }: { publications: FeedPublication[]; startIndex: number }) {
  return (
    <FeedSurface
      publications={publications}
      startIndex={startIndex}
      onEnd={stay}
      endSlot={<FeedWall />}
    />
  );
}
