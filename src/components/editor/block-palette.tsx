"use client";

import {
  ChartLineUp,
  Columns,
  Minus,
  Paragraph,
  Quotes,
  Rows,
  TextH,
} from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import { BLOCK_META, type BlockType } from "@/lib/editor/types";

const ICONS: Record<BlockType, React.ReactNode> = {
  heading: <TextH size={18} />,
  text: <Paragraph size={18} />,
  callout: <Quotes size={18} />,
  chart: <ChartLineUp size={18} />,
  thesis: <Columns size={18} />,
  metrics: <Rows size={18} />,
  divider: <Minus size={18} />,
};

const GROUPS = ["text", "finance", "layout"] as const;

export function BlockPalette({ onAdd }: { onAdd: (type: BlockType) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="t-eyebrow px-1">Blocks</p>
      {GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-1.5">
          <span className="px-1 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            {group}
          </span>
          {(Object.keys(BLOCK_META) as BlockType[])
            .filter((t) => BLOCK_META[t].group === group)
            .map((type) => (
              <button
                key={type}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/stoa-block", type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onAdd(type)}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-btn)] border border-transparent px-3 py-2.5 text-left text-sm",
                  "text-text-mute transition-colors hover:border-border hover:bg-surface-2 hover:text-text",
                )}
              >
                <span className="text-accent">{ICONS[type]}</span>
                <span>
                  <span className="block font-medium">{BLOCK_META[type].label}</span>
                  <span className="t-meta">{BLOCK_META[type].description}</span>
                </span>
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
