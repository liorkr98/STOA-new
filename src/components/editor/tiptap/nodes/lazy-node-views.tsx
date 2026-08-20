"use client";

import dynamic from "next/dynamic";
import { NodeViewWrapper } from "@tiptap/react";

function NodeShell({ minHeight }: { minHeight: number }) {
  return (
    <NodeViewWrapper>
      <div
        className="rounded-[var(--radius-card)] border border-border bg-surface"
        style={{ minHeight }}
        aria-hidden
      />
    </NodeViewWrapper>
  );
}

export const ChartNodeView = dynamic(
  () => import("./chart-node-view").then((m) => m.ChartNodeView),
  { loading: () => <NodeShell minHeight={280} /> },
) as typeof import("./chart-node-view").ChartNodeView;

export const ValuationNodeView = dynamic(
  () => import("./valuation-node-view").then((m) => m.ValuationNodeView),
  { loading: () => <NodeShell minHeight={220} /> },
) as typeof import("./valuation-node-view").ValuationNodeView;

export const ComparisonNodeView = dynamic(
  () => import("./comparison-node-view").then((m) => m.ComparisonNodeView),
  { loading: () => <NodeShell minHeight={240} /> },
) as typeof import("./comparison-node-view").ComparisonNodeView;
