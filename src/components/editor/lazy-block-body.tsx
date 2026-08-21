"use client";

import dynamic from "next/dynamic";
import type { EditorBlock } from "@/lib/editor/types";
import type { FactClaim } from "@/lib/ai/fact-check";

/* Legacy block-format bodies only (pre-Tiptap drafts). ssr:false keeps the
 * legacy renderer and its lightweight-charts dependency out of every report
 * page's First Load JS -- the overwhelming majority of reports never take
 * this path. */
const BlockEditor = dynamic(
  () => import("@/components/editor/block-editor").then((m) => m.BlockEditor),
  { ssr: false },
);

export function LazyBlockBody({
  blocks,
  claims,
  isAuthed = false,
}: {
  blocks: EditorBlock[];
  claims?: FactClaim[];
  isAuthed?: boolean;
}) {
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
