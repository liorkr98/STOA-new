"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { addComment } from "@/app/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Comment } from "@/lib/types";

export function CommentsSection({
  reportId,
  comments,
  isAuthed,
}: {
  reportId: string;
  comments: Comment[];
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    start(async () => {
      const res = await addComment(reportId, text);
      if (res?.error) setError(res.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <section className="mt-10">
      <h2 className="t-h3">Discussion ({comments.length})</h2>

      {isAuthed ? (
        <div className="mt-4 flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add to the discussion"
            className="w-full resize-none rounded-[var(--radius-btn)] border border-border bg-bg p-3 text-sm focus-ring"
          />
          {error && <p className="text-sm text-[var(--down)]">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={submit} disabled={pending || !body.trim()}>
              {pending ? "Posting..." : "Post comment"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="t-meta mt-4">
          <Link href="/sign-in" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-5">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar src={c.author?.avatar_url} name={c.author?.display_name ?? "User"} size="sm" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">
                <span className="font-semibold">{c.author?.display_name ?? "User"}</span>{" "}
                <span className="t-meta">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </span>
              <p className="text-sm text-text">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
