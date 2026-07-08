"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { SlashMenuList } from "./slash-menu-list";
import { SLASH_ITEMS, type SlashItem } from "./slash-menu";

/**
 * Pinned block-insert palette — same items as the slash menu, but opened from
 * the [+] gutter button so we never rely on the suggestion popup surviving a
 * parent re-render.
 */
export function InsertBlockMenu({
  editor,
  docPos,
  anchor,
  onClose,
}: {
  editor: Editor;
  /** Cursor position in the doc where the new block should land. */
  docPos: number;
  anchor: { top: number; left: number };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Capture phase so we close before the editor steals focus.
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function run(item: SlashItem) {
    const range = { from: docPos, to: docPos };
    editor.chain().focus().setTextSelection(docPos).run();
    item.run(editor, range);
    onClose();
  }

  return (
    <div
      ref={ref}
      data-stoa-pinned-menu
      role="presentation"
      className="fixed z-[250]"
      style={{ top: anchor.top, left: anchor.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <SlashMenuList items={SLASH_ITEMS} command={run} />
    </div>
  );
}
