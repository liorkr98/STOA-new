"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { buildExtensions } from "@/lib/editor/tiptap/extensions";

/**
 * Read-only render of a Tiptap report body. Uses the same extension set as
 * the editor (buildExtensions) so the reading view matches the editor
 * exactly. The .stoa-prose--read modifier swaps the drafting sans for the
 * editorial face and reading-scale leading.
 */
export function TiptapReportRenderer({ json }: { json: JSONContent }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: buildExtensions({ editable: false }),
    content: json,
    editorProps: {
      attributes: { class: "stoa-prose stoa-prose--read focus:outline-none" },
    },
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
