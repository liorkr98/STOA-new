"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { postNote } from "@/app/actions/reports";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

const MAX = 1000;

/**
 * Inline note composer at the top of the feed — the social discovery layer.
 * Short, fast posts that show up for followers.
 */
export function QuickPost({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    setError(null);
    start(async () => {
      const res = await postNote(text);
      if (res.error) {
        setError(res.error);
        return;
      }
      setBody("");
      setFocused(false);
      router.refresh();
    });
  }

  const remaining = MAX - body.length;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex gap-3">
        <Avatar src={profile.avatar_url} name={profile.display_name} size="md" />
        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX))}
            onFocus={() => setFocused(true)}
            placeholder="Share a quick take, a note, or what you're watching…"
            rows={focused || body ? 3 : 1}
            className="w-full resize-none bg-transparent text-sm text-text placeholder:text-text-mute focus:outline-none"
          />
          {(focused || body) && (
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`t-meta ${remaining < 50 ? "text-[var(--down)]" : ""}`}
              >
                {remaining} left
              </span>
              <div className="flex items-center gap-2">
                {error && <span className="text-xs text-[var(--down)]">{error}</span>}
                <Button size="sm" disabled={pending || !body.trim()} onClick={submit}>
                  <PaperPlaneTilt size={15} weight="fill" />
                  {pending ? "Posting…" : "Post"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
