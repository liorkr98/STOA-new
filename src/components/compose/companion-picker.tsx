"use client";

import { useEffect, useState } from "react";
import { listLinkablePublications } from "@/app/actions/reports";
import { publicTypeLabel, type PublicationType } from "@/lib/compose/modes";
import type { ContentType } from "@/lib/types";

/** What each type may be connected to: a video to written work, and back. */
const TARGETS: Record<PublicationType, ContentType[]> = {
  video: ["research", "short_post", "call"],
  brief: ["video"],
  thesis: ["video"],
  verdict: ["video", "research", "short_post"],
};

/**
 * Connect this publication to one companion: a video to a research/post, or
 * a written piece to a video. Same column both ways.
 */
export function CompanionPicker({
  currentId,
  type,
  value,
  onChange,
}: {
  currentId?: string;
  type: PublicationType;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [rows, setRows] = useState<
    { id: string; title: string | null; summary: string | null; type: ContentType; status: string; ticker: string | null }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    listLinkablePublications({ excludeId: currentId, types: TARGETS[type] })
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentId, type]);

  const hint =
    type === "video"
      ? "Optional. Attach a written piece this clip belongs to."
      : "Optional. Attach a video this piece belongs with.";

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
