"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { JSONContent } from "@tiptap/core";
import type { FactClaim } from "@/lib/ai/fact-check";

/* ssr:false keeps the Tiptap runtime (editor core, every node view,
 * lightweight-charts) out of the route's First Load JS. The reader gets the
 * server-rendered static body immediately; this chunk streams in behind it and
 * swaps over once its editor instance exists. */
const TiptapReportRenderer = dynamic(
  () => import("@/components/editor/tiptap/report-renderer").then((m) => m.TiptapReportRenderer),
  { ssr: false },
);

export function HydratingReportBody({
  staticHtml,
  json,
  claims = [],
  isAuthed = false,
  reportId,
}: {
  staticHtml: string;
  json: JSONContent;
  claims?: FactClaim[];
  isAuthed?: boolean;
  reportId?: string;
}) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <>
      {!ready && (
        <div
          className="stoa-prose stoa-prose--read"
          dangerouslySetInnerHTML={{ __html: staticHtml }}
        />
      )}
      <div className={ready ? undefined : "hidden"} aria-hidden={!ready}>
        <TiptapReportRenderer
          json={json}
          claims={claims}
          isAuthed={isAuthed}
          reportId={reportId}
          onReady={onReady}
        />
      </div>
    </>
  );
}
