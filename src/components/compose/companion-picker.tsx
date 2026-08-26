"use client";

import { useEffect, useState } from "react";
import { listLinkablePublications } from "@/app/actions/reports";
import { publicTypeLabel, type ComposeMode } from "@/lib/compose/modes";
import type { ContentType } from "@/lib/types";

const TARGETS: Record<ComposeMode, ContentType[]> = {
  video: ["research", "short_post"],
  research: ["video", "call"],
  short_post: ["video", "call"],
};

/**
 * Connect this publication to one companion: a video to a research/post, or
 * a written piece to a video. Same column both ways.
 */
export function CompanionPicker({
  currentId,
  mode,
  value,
  onChange,
}: {
  currentId?: string;
  mode: ComposeMode;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [rows, setRows] = useState<
    { id: string; title: string | null; summary: string | null; type: ContentType; status: string; ticker: string | null }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    listLinkablePublications({ excludeId: currentId, types: TARGETS[mode] })
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentId, mode]);

  const hint =
    mode === "video"
      ? "Optional. Attach a research note or a short post this clip belongs to."
      : "Optional. Attach a video so this piece can play in the Feed.";

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <p className="t-eyebrow mb-2.5">Connected piece</p>
      <p className="t-meta mb-2.5 text-[11px] leading-relaxed">{hint}</p>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring"
      >
        <option value="">None</option>
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {publicTypeLabel(r.type)} · {r.title?.trim() || r.summary?.trim() || r.ticker || "Untitled"} · {r.status}
          </option>
        ))}
      </select>
    </section>
  );
}
