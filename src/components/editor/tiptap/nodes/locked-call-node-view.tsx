"use client";

import { useEffect, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Lock } from "lucide-react";
import { DirectionTag } from "@/components/ui/tag";
import { price as fmtPrice } from "@/lib/format";
import type { Direction } from "@/lib/types";

/**
 * lockedCallNode (Phase 1.4) -- the call itself, pinned as the first block so
 * it can never be mistaken for body content. Full ledger-card trust treatment
 * (doubled hairline). Display-only in the editor: the analyst edits the call
 * in the Lock & Publish panel, which syncs its attrs here one-way (the panel
 * stays the single editable source, and the columns still drive the
 * prediction at publish). Reading view uses the report page's PredictionCard
 * (same ledger + seal treatment), so this renders nothing when not editable.
 */
export function LockedCallNodeView({ node, editor }: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const ticker = String(node.attrs.ticker ?? "");
  const direction = (node.attrs.direction ?? "long") as Direction;
  const target = node.attrs.target != null ? Number(node.attrs.target) : null;
  const horizonDays = Number(node.attrs.horizonDays ?? 30);
  const [live, setLive] = useState<number | null>(null);

  useEffect(() => {
    if (!isEditable || !ticker) {
      setLive(null);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/market/quote?ticker=${encodeURIComponent(ticker)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((j: { price?: number }) => setLive(j.price ?? null))
        .catch(() => setLive(null));
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [ticker, isEditable]);

  if (!isEditable) return null;

  const move = live != null && target != null && live > 0 ? ((target - live) / live) * 100 : null;
  const upside = move != null ? (direction === "short" ? -move : move) : null;
  const horizonDate = new Date(Date.now() + horizonDays * 86_400_000);

  return (
    <NodeViewWrapper
      contentEditable={false}
      role="figure"
      aria-label={`The call: ${ticker || "no ticker set"}, ${direction}${target != null ? `, target ${target}` : ""}`}
      className="ledger-call my-4 select-none rounded-[var(--radius-card)] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="t-eyebrow"
            style={{ color: "color-mix(in srgb, var(--ink) 60%, transparent)" }}
          >
            The call
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className="num text-xl font-semibold">{ticker || "—"}</span>
            <DirectionTag direction={direction} />
            {target != null && <span className="num text-xl font-semibold">${fmtPrice(target)}</span>}
          </div>
          <p className="t-meta mt-1 text-[12px]">
            Resolves{" "}
            {horizonDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {upside != null && (
              <>
                {" · "}
                <span style={{ color: upside >= 0 ? "var(--up)" : "var(--down)" }} className="num">
                  {upside >= 0 ? "+" : ""}
                  {upside.toFixed(1)}%
                </span>{" "}
                to target
              </>
            )}
          </p>
        </div>
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--brass)] text-[var(--brass)]"
        >
          <Lock size={16} />
        </span>
      </div>
      <p className="t-meta mt-3 border-t border-border pt-2 text-[11px]">
        Set in the Lock &amp; Publish panel. Locks permanently at publish.
      </p>
    </NodeViewWrapper>
  );
}
