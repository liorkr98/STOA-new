"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookmarkSimple, Heart } from "@phosphor-icons/react";
import { toggleLike, toggleSave } from "@/app/actions/social";
import { cn } from "@/lib/design/cn";

export function ReportActions({
  reportId,
  initialLikes,
  initialLiked,
  initialSaved,
  isAuthed,
}: {
  reportId: string;
  initialLikes: number;
  initialLiked: boolean;
  initialSaved: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [saved, setSaved] = useState(initialSaved);
  const [, start] = useTransition();

  function onLike() {
    if (!isAuthed) return router.push("/sign-in");
    setLiked((v) => !v);
    setLikes((n) => n + (liked ? -1 : 1));
    start(async () => {
      const res = await toggleLike(reportId);
      setLiked(res.liked);
    });
  }

  function onSave() {
    if (!isAuthed) return router.push("/sign-in");
    setSaved((v) => !v);
    start(async () => {
      const res = await toggleSave(reportId);
      setSaved(res.saved);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onLike}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong",
          liked && "text-[var(--down)]",
        )}
      >
        <Heart size={16} weight={liked ? "fill" : "regular"} />
        <span className="num">{likes}</span>
      </button>
      <button
        onClick={onSave}
        aria-label="Save"
        className={cn(
          "inline-flex items-center rounded-[var(--radius-btn)] border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong",
          saved && "text-accent",
        )}
      >
        <BookmarkSimple size={16} weight={saved ? "fill" : "regular"} />
      </button>
    </div>
  );
}
