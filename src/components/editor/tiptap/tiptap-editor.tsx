"use client";

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
export function TiptapEditor({
  initialContent,
  onChange,
  onReady,
}: {
  initialContent: JSONContent;
  onChange: (change: EditorChange) => void;
  onReady?: (editor: Editor) => void;
}) {
  const editor = useEditor({
    // Required for Next.js SSR: render on the client to avoid hydration drift.
    immediatelyRender: false,
    extensions: [...buildExtensions({ editable: true }), SlashMenu, BlockActionsShortcut],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "stoa-prose focus:outline-none",
        spellcheck: "true",
      },
      // Drag-to-insert for the AI ask-panel (Layer 4): a card sets a Tiptap
      // node JSON on the "application/stoa-node" transfer; here it lands as a
      // real node at the drop position.
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
    onCreate: ({ editor: e }) => onReady?.(e),
    onUpdate: ({ editor: e }) => onChange({ json: e.getJSON(), text: e.getText() }),
  });

  if (!editor) return null;

  return (
    <div className="relative">
      <BlockDragHandle editor={editor} />
      <BubbleToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
