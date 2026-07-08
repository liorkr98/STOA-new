"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { SlashMenuList, type SlashMenuListRef } from "./slash-menu-list";
import { slashMenuBridge } from "@/lib/editor/tiptap/slash-menu-bridge";
import type { SlashItem } from "./slash-menu";

function caretRect(
  editor: Editor,
  clientRect: (() => DOMRect | null) | null | undefined,
): DOMRect | null {
  const rect = clientRect?.() ?? null;
  if (rect && rect.height > 0) return rect;
  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);
  return new DOMRect(coords.left, coords.top, 1, Math.max(coords.bottom - coords.top, 16));
}

function positionPopup(el: HTMLElement | null, rect: DOMRect | null) {
  if (!el || !rect) return;
  const margin = 8;
  el.style.left = `${Math.max(margin, rect.left)}px`;
  const below = rect.bottom + margin;
  const wouldOverflow = below + el.offsetHeight > window.innerHeight - margin;
  if (wouldOverflow) {
    el.style.top = `${Math.max(margin, rect.top - el.offsetHeight - margin)}px`;
  } else {
    el.style.top = `${below}px`;
  }
}

/**
 * Pinned slash menu rendered in React (not ProseMirror suggestion DOM).
 * Stays open while typing /query and survives parent re-renders.
 */
export function SlashMenuHost({ editor }: { editor: Editor }) {
  const [, tick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<SlashMenuListRef>(null);
  const bridge = slashMenuBridge.getState();

  useEffect(() => {
    return slashMenuBridge.subscribe(() => {
      tick((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    slashMenuBridge.setKeyHandler((event) => listRef.current?.onKeyDown({ event }) ?? false);
    return () => slashMenuBridge.setKeyHandler(null);
  }, []);

  useEffect(() => {
    if (!bridge) return;
    positionPopup(ref.current, caretRect(editor, bridge.clientRect));
  });

  useEffect(() => {
    if (!bridge) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      slashMenuBridge.close();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [bridge]);

  if (!bridge || typeof document === "undefined") return null;

  function run(item: SlashItem) {
    bridge!.command(item);
    slashMenuBridge.close();
  }

  return createPortal(
    <div
      ref={ref}
      role="listbox"
      aria-label="Insert block"
      className="fixed z-[260]"
      onMouseDown={(e) => e.preventDefault()}
    >
      <SlashMenuList ref={listRef} items={bridge.items} command={run} />
    </div>,
    document.body,
  );
}
