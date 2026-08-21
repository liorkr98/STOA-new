"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { GripVertical, Plus, Copy, ArrowUp, ArrowDown, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { InsertBlockMenu } from "./insert-block-menu";

interface BlockTarget {
  node: PMNode;
  pos: number;
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

type PinnedMenu =
  | { kind: "insert"; target: BlockTarget; anchor: { top: number; left: number }; docPos: number }
  | { kind: "actions"; target: BlockTarget; anchor: { top: number; left: number } };

/**
 * The follower side-menu (Phase 1.1). A [+] opens the insert palette; [⠿]
 * opens block actions. Menus are portaled and pinned so moving the pointer off
 * the gutter does not dismiss them before you can click.
 */
export function BlockDragHandle({ editor }: { editor: Editor }) {
  const [hoverTarget, setHoverTarget] = useState<BlockTarget | null>(null);
  const [pinned, setPinned] = useState<PinnedMenu | null>(null);
  const pinnedRef = useRef<PinnedMenu | null>(null);
  pinnedRef.current = pinned;

  const closePinned = useCallback(() => setPinned(null), []);

  // Keyboard-anchored actions menu (Cmd/Ctrl+Shift+K).
  useEffect(() => {
    function onShortcut(e: Event) {
      const pos = (e as CustomEvent<{ pos: number }>).detail?.pos;
      if (typeof pos !== "number") return;
      const node = editor.state.doc.nodeAt(pos);
      if (!node) return;
      const coords = editor.view.coordsAtPos(pos + 1);
      setPinned({
        kind: "actions",
        target: { node, pos },
        anchor: { top: coords.bottom + 4, left: coords.left - 36 },
      });
    }
    window.addEventListener("stoa-block-actions", onShortcut);
    return () => window.removeEventListener("stoa-block-actions", onShortcut);
  }, [editor]);

  useEffect(() => {
    if (!pinned) return;
    function onPointerDown(e: PointerEvent) {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("[data-stoa-pinned-menu]")) return;
      // Ignore clicks on the gutter buttons themselves (they toggle menus).
      if (el?.closest?.("[data-stoa-gutter]")) return;
      setPinned(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPinned(null);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  function openInsert(e: React.MouseEvent, target: BlockTarget) {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const at = target.pos + target.node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(at, { type: "paragraph" })
      .setTextSelection(at + 1)
      .run();
    setPinned({
      kind: "insert",
      target,
      anchor: { top: rect.bottom + 6, left: rect.left },
      docPos: at + 1,
    });
  }

  function openActions(e: React.MouseEvent, target: BlockTarget) {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (pinnedRef.current?.kind === "actions" && pinnedRef.current.target.pos === target.pos) {
      setPinned(null);
      return;
    }
    setPinned({
      kind: "actions",
      target,
      anchor: { top: rect.bottom + 6, left: rect.left },
    });
  }

  // Must stay referentially stable: @tiptap/extension-drag-handle-react keys
  // its plugin-registration effect on onNodeChange, so a new function each
  // render unregisters and re-registers the drag-handle plugin. That
  // reconfigures the editor's plugin set on every keystroke and destroys every
  // plugin view with it, including the slash-menu suggestion popup the instant
  // it opens. Do not inline this back.
  const onNodeChange = useCallback(({ node, pos }: { node: PMNode | null; pos: number }) => {
    if (node && pos >= 0) setHoverTarget({ node, pos });
    // Do not close pinned menus when hover moves -- that was a separate bug.
  }, []);

  return (
    <>
      <DragHandle editor={editor} onNodeChange={onNodeChange}>
        <div data-stoa-gutter className="relative flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Insert block below"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => hoverTarget && openInsert(e, hoverTarget)}
            className="flex h-6 w-5 items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors hover:bg-surface-2 hover:text-text focus-ring"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            aria-label="Block actions"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => hoverTarget && openActions(e, hoverTarget)}
            className="flex h-6 w-5 cursor-grab items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors hover:bg-surface-2 hover:text-text active:cursor-grabbing"
          >
            <GripVertical size={15} />
          </button>
        </div>
      </DragHandle>

      {pinned &&
        typeof document !== "undefined" &&
        createPortal(
          pinned.kind === "insert" ? (
            <InsertBlockMenu
              editor={editor}
              docPos={pinned.docPos}
              anchor={pinned.anchor}
              onClose={closePinned}
            />
          ) : (
            <ActionsMenu
              id="stoa-pinned-block-menu"
              editor={editor}
              target={pinned.target}
              anchor={pinned.anchor}
              onClose={closePinned}
            />
          ),
          document.body,
        )}
    </>
  );
}

function ActionsMenu({
  id,
  editor,
  target,
  anchor,
  onClose,
}: {
  id: string;
  editor: Editor;
  target: BlockTarget;
  anchor: { top: number; left: number };
  onClose: () => void;
}) {
  function run(fn: () => void) {
    fn();
    onClose();
  }

  return (
    <div
      id={id}
      data-stoa-pinned-menu
      role="menu"
      className="menu-pop fixed z-[250] w-44 overflow-hidden rounded-[var(--r-card)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
      style={{ top: anchor.top, left: anchor.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Item
        icon={Plus}
        label="Insert below"
        onClick={() =>
          run(() => {
            const at = target.pos + target.node.nodeSize;
            editor
              .chain()
              .focus()
              .insertContentAt(at, { type: "paragraph" })
              .setTextSelection(at + 1)
              .run();
          })
        }
      />
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
      onMouseDown={(e) => e.preventDefault()}
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
