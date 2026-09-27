"use client";

import { useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { buildExtensions } from "@/lib/editor/tiptap/extensions";
import { TickerHoverLayer } from "@/components/report/ticker-hover-layer";
import { TiptapClaimHighlighter } from "@/components/report/tiptap-claim-highlighter";
import type { FactClaim } from "@/lib/ai/fact-check";
import type { FeedCard } from "@/lib/feed/types";
import { ReaderCardsContext } from "@/components/report/reader-cards";

function containsMath(node: JSONContent): boolean {
  const t = node.type ?? "";
  if (t === "math" || t === "inlineMath" || t === "blockMath") return true;
  return node.content?.some(containsMath) ?? false;
}

/**
 * Read-only render of a Tiptap report body. Uses the same extension set as
 * the editor (buildExtensions) so the reading view matches the editor
 * exactly, at the reading size. The .stoa-prose--read modifier only drops the
 * editor's drag gutter and caps the measure.
 */
export function TiptapReportRenderer({
  json,
  claims = [],
  isAuthed = false,
  reportId,
  cards,
  ticker = null,
}: {
  json: JSONContent;
  claims?: FactClaim[];
  isAuthed?: boolean;
  reportId?: string;
  /** The reader-safe deck, for cards placed inside the body. */
  cards?: FeedCard[];
  ticker?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const extensions = useMemo(() => buildExtensions({ editable: false }), []);
  const readerCards = useMemo(
    () =>
      cards
        ? {
            cards,
            ticker,
            onSealedTap: () =>
              document.getElementById("report-gate")?.scrollIntoView({ behavior: "smooth", block: "center" }),
          }
        : null,
    [cards, ticker],
  );
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions,
    content: json,
    editorProps: {
      attributes: { class: "stoa-prose stoa-prose--read focus:outline-none", dir: "auto" },
    },
  });

  useEffect(() => {
    if (!containsMath(json)) return;
    void import("@/components/editor/tiptap/katex-css");
  }, [json]);

  if (!editor) return null;
  return (
    <div ref={rootRef}>
      <ReaderCardsContext.Provider value={readerCards}>
        <EditorContent editor={editor} />
      </ReaderCardsContext.Provider>
      <TickerHoverLayer />
      {claims.length > 0 && (
        <TiptapClaimHighlighter
          claims={claims}
          rootRef={rootRef}
          isAuthed={isAuthed}
          reportId={reportId}
        />
      )}
    </div>
  );
}
