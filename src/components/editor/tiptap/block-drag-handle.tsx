"use client";

import { useState } from "react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { GripVertical, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * The explicit block drag handle (docs Compose-Deep-Dive 1.2). Lives in the
 * left gutter, appears on block hover, and is the ONLY thing that starts a
 * drag -- clicking block text never moves anything. Dragging reorders;
 * clicking the grip opens a small action menu (duplicate, delete). Reorder is
 * the drag itself, so no move-up/down commands are needed.
 */
export function BlockDragHandle({ editor }: { editor: Editor }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [current, setCurrent] = useState<{ node: PMNode; pos: number } | null>(null);

  function duplicate() {
    if (!current) return;
    editor
      .chain()
      .focus()
      .insertContentAt(current.pos + current.node.nodeSize, current.node.toJSON())
      .run();
    setMenuOpen(false);
  }

  function remove() {
    if (!current) return;
    editor.chain().focus().setNodeSelection(current.pos).deleteSelection().run();
    setMenuOpen(false);
  }

  return (
    <DragHandle
      editor={editor}
      onNodeChange={({ node, pos }) => {
        if (node && pos >= 0) setCurrent({ node, pos });
        setMenuOpen(false);
      }}
    >
      <div className="relative">
        <button
          type="button"
          aria-label="Block actions"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-6 w-5 cursor-grab items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors hover:bg-surface-2 hover:text-text active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </button>
        {menuOpen && (
          <div className="menu-pop absolute left-0 top-7 z-50 w-40 overflow-hidden rounded-[var(--r-card)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]">
            <MenuItem icon={Copy} label="Duplicate" onClick={duplicate} />
            <MenuItem icon={Trash2} label="Delete" tone="down" onClick={remove} />
          </div>
        )}
      </div>
    </DragHandle>
  );
}

function MenuItem({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  tone?: "down";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-btn)] px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2",
        tone === "down" ? "text-[var(--down)]" : "text-text-mute hover:text-text",
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
