"use client";

import "katex/dist/katex.min.css";
import { memo, useMemo, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { buildExtensions } from "@/lib/editor/tiptap/extensions";
import { SlashMenu } from "./slash-menu";
import { BubbleToolbar } from "./bubble-toolbar";
import { BlockDragHandle, BlockActionsShortcut } from "./block-drag-handle";

export interface EditorChange {
  json: JSONContent;
  text: string;
}

/**
 * The Compose editor core. Tiptap owns selection/history/drag/paste (Layer 1);
 * we layer the slash menu, floating toolbar, and drag handle on top (Layer 2).
 * Financial nodes (Layer 3) join by extending buildExtensions + SLASH_ITEMS,
 * with no change here. Parent keeps the latest {json,text} via onChange and
 * gets the editor instance via onReady for AI-insert (Layer 4) and publish.
 */
export const TiptapEditor = memo(function TiptapEditor({
  initialContent,
  onChange,
  onReady,
  reportTicker,
}: {
  initialContent: JSONContent;
  onChange: (change: EditorChange) => void;
  onReady?: (editor: Editor) => void;
  reportTicker?: string;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const extensions = useMemo(
    () => [...buildExtensions({ editable: true }), SlashMenu, BlockActionsShortcut],
    [],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions,
      content: initialContent,
      editorProps: {
        attributes: {
          class: "stoa-prose focus:outline-none",
          spellcheck: "true",
        },
        handleDrop(view, event) {
          const raw = (event as DragEvent).dataTransfer?.getData("application/stoa-node");
          if (!raw) return false;
          event.preventDefault();
          try {
            const node = view.state.schema.nodeFromJSON(JSON.parse(raw));
            const coords = view.posAtCoords({
              left: (event as DragEvent).clientX,
              top: (event as DragEvent).clientY,
            });
            const pos = coords ? coords.pos : view.state.selection.from;
            view.dispatch(view.state.tr.insert(pos, node));
            return true;
          } catch {
            return false;
          }
        },
      },
      onCreate: ({ editor: e }) => onReadyRef.current?.(e),
      onUpdate: ({ editor: e }) =>
        onChangeRef.current({ json: e.getJSON(), text: e.getText() }),
    },
    [],
  );

  if (!editor) return null;

  return (
    <div className="relative">
      <BlockDragHandle editor={editor} />
      <BubbleToolbar editor={editor} reportTicker={reportTicker} />
      <EditorContent editor={editor} />
    </div>
  );
});
