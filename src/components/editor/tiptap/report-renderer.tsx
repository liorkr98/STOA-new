"use client";

import "katex/dist/katex.min.css";
import { useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { buildExtensions } from "@/lib/editor/tiptap/extensions";
import { TickerHoverLayer } from "@/components/report/ticker-hover-layer";
import { TiptapClaimHighlighter } from "@/components/report/tiptap-claim-highlighter";
import type { FactClaim } from "@/lib/ai/fact-check";

/**
 * Read-only render of a Tiptap report body. Uses the same extension set as
 * the editor (buildExtensions) so the reading view matches the editor
 * exactly. The .stoa-prose--read modifier swaps the drafting sans for the
 * editorial face and reading-scale leading.
 */
export function TiptapReportRenderer({
  json,
  claims = [],
}: {
  json: JSONContent;
  claims?: FactClaim[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const extensions = useMemo(() => buildExtensions({ editable: false }), []);
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions,
    content: json,
    editorProps: {
      attributes: { class: "stoa-prose stoa-prose--read focus:outline-none" },
    },
  });

  if (!editor) return null;
  return (
    <div ref={rootRef}>
      <EditorContent editor={editor} />
      <TickerHoverLayer />
      {claims.length > 0 && <TiptapClaimHighlighter claims={claims} rootRef={rootRef} />}
    </div>
  );
}
