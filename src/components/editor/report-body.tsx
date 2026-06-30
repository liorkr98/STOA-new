import { parseDocument } from "@/lib/editor/document";
import type { EditorBlock } from "@/lib/editor/types";
import { BlockEditor } from "@/components/editor/block-editor";

export function ReportBody({ body }: { body: string | null }) {
  if (!body?.trim()) return null;

  if (!body.trimStart().startsWith("{")) {
    return (
      <div className="mt-8 whitespace-pre-wrap text-[1.0625rem] leading-[1.8] text-text">
        {body}
      </div>
    );
  }

  const doc = parseDocument(body);
  const blocks: EditorBlock[] = doc.blocks;

  return (
    <div className="mt-8 flex flex-col gap-8">
      {blocks.map((block) => (
        <section key={block.id}>
          <BlockEditor block={block} onChange={() => {}} readOnly />
        </section>
      ))}
    </div>
  );
}
