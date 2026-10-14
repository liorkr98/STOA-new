"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { CartTap } from "@/components/interest-cart/cart-tap";
import { useInterestCart } from "@/components/interest-cart/gate";
import { normaliseTicker } from "@/lib/interest-cart/cart";

const KEY = new PluginKey("cartInlineTaps");

type Slot = { key: string; ticker: string; el: HTMLElement };

/**
 * The reader's bull and bear after each $TICKER mention in a report body,
 * while the Interest Cart is on. The mention itself stays a plain mark (its
 * hover card is unchanged); the control is a ProseMirror widget beside it,
 * never inside it, and React renders into each widget through a portal.
 * Hover does not exist on touch, so this is the control for body mentions.
 */
export function ReportInlineCartTaps({ editor }: { editor: Editor }) {
  const on = Boolean(useInterestCart());
  // The doc never changes in the reader, so the slots are worked out once.
  const slots = useMemo<(Slot & { end: number })[]>(() => {
    const markType = editor.schema.marks.tickerMark;
    if (!on || !markType) return [];
    const ranges: { end: number; ticker: string }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      const mark = node.marks.find((m) => m.type === markType);
      const ticker = mark ? normaliseTicker(String(mark.attrs.ticker ?? "")) : null;
      if (!ticker) return;
      const last = ranges[ranges.length - 1];
      // One mention can span several text nodes (a bold letter inside it).
      if (last && last.end === pos && last.ticker === ticker) last.end = pos + node.nodeSize;
      else ranges.push({ end: pos + node.nodeSize, ticker });
    });
    return ranges.map(({ end, ticker }) => {
      const el = document.createElement("span");
      el.className = "cart-inline";
      el.contentEditable = "false";
      return { key: `cart-${end}-${ticker}`, ticker, el, end };
    });
  }, [editor, on]);

  useEffect(() => {
    if (slots.length === 0) return;
    const decorations = slots.map((slot) =>
      Decoration.widget(slot.end, slot.el, { side: 1, key: slot.key, ignoreSelection: true, stopEvent: () => true }),
    );
    // Built once: DecorationSet.create consumes the array it is given, and the
    // reader's doc never changes.
    const set = DecorationSet.create(editor.state.doc, decorations);
    editor.registerPlugin(new Plugin({ key: KEY, props: { decorations: () => set } }));
    return () => {
      editor.unregisterPlugin(KEY);
    };
  }, [editor, slots]);

  return <>{slots.map((s) => createPortal(<CartTap ticker={s.ticker} size={16} />, s.el, s.key))}</>;
}
