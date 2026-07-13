"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * Switches Discover between the video-first grid and the legacy text mosaic
 * (Part 1: both layouts stay reachable during the measured rollout). Writes a
 * `layout` search param that overrides the feature flag.
 */
export function DiscoverLayoutToggle({ current }: { current: "video" | "text" }) {
  const router = useRouter();
  const params = useSearchParams();

  function setLayout(layout: "video" | "text") {
    const next = new URLSearchParams(params.toString());
    next.set("layout", layout);
    router.replace(`/discover?${next.toString()}`, { scroll: false });
  }

  return (
    <div
      role="group"
      aria-label="Discover layout"
      className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-btn)] border border-border bg-surface p-0.5"
    >
      <button
        type="button"
        onClick={() => setLayout("video")}
        aria-pressed={current === "video"}
        className={cn(
          "focus-ring inline-flex items-center gap-1.5 rounded-[calc(var(--radius-btn)-2px)] px-2.5 py-1 text-xs font-medium transition-colors",
          current === "video" ? "bg-surface-2 text-text" : "text-text-mute hover:text-text",
        )}
      >
        <LayoutGrid size={13} aria-hidden />
        Video
      </button>
      <button
        type="button"
        onClick={() => setLayout("text")}
        aria-pressed={current === "text"}
        className={cn(
          "focus-ring inline-flex items-center gap-1.5 rounded-[calc(var(--radius-btn)-2px)] px-2.5 py-1 text-xs font-medium transition-colors",
          current === "text" ? "bg-surface-2 text-text" : "text-text-mute hover:text-text",
        )}
      >
        <Rows3 size={13} aria-hidden />
        Text
      </button>
    </div>
  );
}
