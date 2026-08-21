import { parseDocument } from "@/lib/editor/document";
import { isTiptapDoc, parseTiptapDoc } from "@/lib/editor/tiptap/serialize";
import { tiptapStaticHtml } from "@/lib/editor/tiptap/static-html";
import { HydratingReportBody } from "@/components/editor/hydrating-report-body";
import { LazyBlockBody } from "@/components/editor/lazy-block-body";
import { FactCheckedText } from "@/components/report/fact-check-layer";
import type { FactClaim } from "@/lib/ai/fact-check";

/**
 * Server component. Tiptap bodies render to static HTML here (instant text
 * for readers and crawlers -- previously the body was client-only and blank
 * until the full editor runtime hydrated); the interactive renderer streams
 * in lazily and swaps over when ready. Interactive nodes (charts, video)
 * render as empty placeholders in the static pass and appear on hydration.
 */
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

  if (isTiptapDoc(body)) {
    const json = parseTiptapDoc(body);
    const staticHtml = tiptapStaticHtml(json);
    return (
      <div className="mt-8">
        <HydratingReportBody
          staticHtml={staticHtml}
          json={json}
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
  return <LazyBlockBody blocks={doc.blocks} claims={claims} isAuthed={isAuthed} />;
}
