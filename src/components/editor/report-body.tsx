import { parseDocument } from "@/lib/editor/document";
import { isTiptapDoc, parseTiptapDoc } from "@/lib/editor/tiptap/serialize";
import type { EditorBlock } from "@/lib/editor/types";
import { BlockEditor } from "@/components/editor/block-editor";
import { TiptapReportRenderer } from "@/components/editor/tiptap/report-renderer";
import { FactCheckedText } from "@/components/report/fact-check-layer";
import type { FactClaim } from "@/lib/ai/fact-check";

export function ReportBody({
  body,
  claims,
  isAuthed = false,
  reportId,
}: {
  body: string | null;
  claims?: FactClaim[];
  isAuthed?: boolean;
  reportId?: string;
}) {
  if (!body?.trim()) return null;

  // New reports are Tiptap JSON. Interactive claim popovers mount via
  // TiptapClaimHighlighter until char-offset TipTap marks land.
  if (isTiptapDoc(body)) {
    return (
      <div className="mt-8">
        <TiptapReportRenderer
          json={parseTiptapDoc(body)}
          claims={claims}
          isAuthed={isAuthed}
          reportId={reportId}
        />
      </div>
    );
  }

  if (!body.trimStart().startsWith("{")) {
    return (
      <div className="mt-8 whitespace-pre-wrap text-[1.0625rem] leading-[1.8] text-text">
        {claims && claims.length > 0 ? (
          <FactCheckedText text={body} claims={claims} isAuthed={isAuthed} reportId={reportId} />
        ) : (
          body
        )}
      </div>
    );
  }

  const doc = parseDocument(body);
  const blocks: EditorBlock[] = doc.blocks;

  return (
    <div className="mt-8 flex flex-col gap-8">
      {blocks.map((block) => (
        <section key={block.id}>
          <BlockEditor block={block} onChange={() => {}} readOnly claims={claims} isAuthed={isAuthed} />
        </section>
      ))}
    </div>
  );
}
