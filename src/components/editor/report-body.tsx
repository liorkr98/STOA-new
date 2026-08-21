import { parseDocument } from "@/lib/editor/document";
import { isTiptapDoc, parseTiptapDoc } from "@/lib/editor/tiptap/serialize";
import { tiptapStaticHtml } from "@/lib/editor/tiptap/static-html";
import { HydratingReportBody } from "@/components/editor/hydrating-report-body";
import { LazyBlockBody } from "@/components/editor/lazy-block-body";
import { FactCheckedText } from "@/components/report/fact-check-layer";
import type { FactClaim } from "@/lib/ai/fact-check";

/**
 * Server component. Tiptap bodies render to static HTML here, so the text is
 * present on first paint and in the HTML crawlers see -- previously the body
 * was client-only behind immediatelyRender:false, meaning a blank article
 * until the whole editor runtime hydrated. The interactive renderer streams in
 * lazily and swaps over when ready; interactive nodes (charts, video) appear
 * at that point.
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
    return (
      <div className="mt-8">
        <HydratingReportBody
          staticHtml={tiptapStaticHtml(json)}
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
