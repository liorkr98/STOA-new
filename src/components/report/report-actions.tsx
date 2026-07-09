"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, Heart } from "lucide-react";
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
        type="button"
        aria-label={liked ? "Unlike" : "Like"}
        aria-pressed={liked}
        className={cn(
          "focus-ring inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong",
          liked && "text-accent",
        )}
      >
        <Heart size={16} className={liked ? "fill-current" : undefined} />
        <span className="num">{likes}</span>
      </button>
      <button
        onClick={onSave}
        type="button"
        aria-label={saved ? "Unsave" : "Save"}
        aria-pressed={saved}
        className={cn(
          "focus-ring inline-flex items-center rounded-[var(--radius-btn)] border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong",
          saved && "text-accent",
        )}
      >
        <Bookmark size={16} className={saved ? "fill-current" : undefined} />
      </button>
    </div>
  );
}
