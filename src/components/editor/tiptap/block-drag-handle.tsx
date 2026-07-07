"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { GripVertical, Plus, Copy, ArrowUp, ArrowDown, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/design/cn";

interface BlockTarget {
  node: PMNode;
  pos: number;
}

/** Insert an empty paragraph below the block and open the slash menu there. */
function insertBelow(editor: Editor, t: BlockTarget) {
  const at = t.pos + t.node.nodeSize;
  editor
    .chain()
    .focus()
    .insertContentAt(at, { type: "paragraph" })
    .setTextSelection(at + 1)
    .insertContent("/")
    .run();
}

function duplicate(editor: Editor, t: BlockTarget) {
  editor.chain().focus().insertContentAt(t.pos + t.node.nodeSize, t.node.toJSON()).run();
}

function remove(editor: Editor, t: BlockTarget) {
  editor.chain().focus().setNodeSelection(t.pos).deleteSelection().run();
}

/** Swap the block with its previous/next sibling in one transaction. */
function moveBlock(editor: Editor, t: BlockTarget, dir: "up" | "down") {
  const { state } = editor;
  const $pos = state.doc.resolve(t.pos);
  const index = $pos.index();
  const parent = $pos.parent;
  const targetIdx = dir === "up" ? index - 1 : index + 1;
  if (targetIdx < 0 || targetIdx >= parent.childCount) return;

  const node = t.node;
  const tr = state.tr;
  if (dir === "up") {
    const prev = parent.child(index - 1);
    const prevPos = t.pos - prev.nodeSize;
    tr.delete(t.pos, t.pos + node.nodeSize);
    tr.insert(prevPos, node);
  } else {
    const next = parent.child(index + 1);
    tr.delete(t.pos, t.pos + node.nodeSize);
    tr.insert(t.pos + next.nodeSize, node);
  }
  editor.view.dispatch(tr);
}

/**
 * Keyboard access to block actions (Phase 1.1). Cmd/Ctrl+Shift+K broadcasts
 * the current block's position; the drag-handle component anchors its action
 * menu there so keyboard users get the same affordance as hover.
 */
export const BlockActionsShortcut = Extension.create({
  name: "blockActionsShortcut",
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-k": () => {
        const { $from } = this.editor.state.selection;
        const pos = $from.before(1);
        window.dispatchEvent(new CustomEvent("stoa-block-actions", { detail: { pos } }));
        return true;
      },
    };
  },
});

/**
 * The follower side-menu (Phase 1.1). A [+] (insert below, opens the slash
 * menu) and a [⠿] grip (drag to reorder + click for block actions) sit in the
 * left gutter beside the hovered block. Dragging the grip is the only thing
 * that starts a reorder; clicking text never drags. Keyboard users reach the
 * same actions via Cmd/Ctrl+Shift+K.
 */
export function BlockDragHandle({ editor }: { editor: Editor }) {
  const [hoverTarget, setHoverTarget] = useState<BlockTarget | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Keyboard-anchored menu (Cmd/Ctrl+Shift+K).
  const [kbd, setKbd] = useState<{ target: BlockTarget; top: number; left: number } | null>(null);
  const kbdRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onShortcut(e: Event) {
      const pos = (e as CustomEvent<{ pos: number }>).detail?.pos;
      if (typeof pos !== "number") return;
      const node = editor.state.doc.nodeAt(pos);
      if (!node) return;
      const coords = editor.view.coordsAtPos(pos + 1);
      setKbd({ target: { node, pos }, top: coords.top, left: coords.left - 36 });
    }
    window.addEventListener("stoa-block-actions", onShortcut);
    return () => window.removeEventListener("stoa-block-actions", onShortcut);
  }, [editor]);

  useEffect(() => {
    if (!kbd) return;
    function onAway(e: MouseEvent) {
      if (kbdRef.current && !kbdRef.current.contains(e.target as Node)) setKbd(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setKbd(null);
    }
    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [kbd]);

  // Must be referentially stable: @tiptap/extension-drag-handle-react keys its
  // plugin-registration effect on onNodeChange, so a fresh function each render
  // makes it unregister/re-register the drag-handle plugin. That reconfigures the
  // editor's plugin set on every keystroke, which destroys all plugin views --
  // including the slash-menu suggestion popup the instant it opens.
  const onNodeChange = useCallback(({ node, pos }: { node: PMNode | null; pos: number }) => {
    if (node && pos >= 0) setHoverTarget({ node, pos });
    setMenuOpen(false);
  }, []);

  return (
    <>
      <DragHandle editor={editor} onNodeChange={onNodeChange}>
        <div className="relative flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Insert block below"
            onClick={() => hoverTarget && insertBelow(editor, hoverTarget)}
            className="flex h-6 w-5 items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors hover:bg-surface-2 hover:text-text focus-ring"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            aria-label="Block actions"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-6 w-5 cursor-grab items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors hover:bg-surface-2 hover:text-text active:cursor-grabbing"
          >
            <GripVertical size={15} />
          </button>
          {menuOpen && hoverTarget && (
            <ActionsMenu
              editor={editor}
              target={hoverTarget}
              className="absolute left-0 top-7 z-50"
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </DragHandle>

      {kbd && (
        <div
          ref={kbdRef}
          style={{ position: "fixed", top: kbd.top, left: kbd.left }}
          className="z-50"
        >
          <ActionsMenu editor={editor} target={kbd.target} onClose={() => setKbd(null)} />
        </div>
      )}
    </>
  );
}

function ActionsMenu({
  editor,
  target,
  className,
  onClose,
}: {
  editor: Editor;
  target: BlockTarget;
  className?: string;
  onClose: () => void;
}) {
  function run(fn: () => void) {
    fn();
    onClose();
  }
  return (
    <div
      role="menu"
      className={cn(
        "menu-pop w-44 overflow-hidden rounded-[var(--r-card)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <Item icon={Plus} label="Insert below" onClick={() => run(() => insertBelow(editor, target))} />
      <Item icon={Copy} label="Duplicate" onClick={() => run(() => duplicate(editor, target))} />
      <Item icon={ArrowUp} label="Move up" onClick={() => run(() => moveBlock(editor, target, "up"))} />
      <Item icon={ArrowDown} label="Move down" onClick={() => run(() => moveBlock(editor, target, "down"))} />
      <Item icon={Trash2} label="Delete" tone="down" onClick={() => run(() => remove(editor, target))} />
    </div>
  );
}

function Item({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "down";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
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
