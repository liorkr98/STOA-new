import { TiptapReportRenderer } from "@/components/editor/tiptap/report-renderer";
import type { JSONContent } from "@tiptap/core";

/**
 * Dev-only: verifies the Phase 1.2/1.3 marks parse + render in the read
 * renderer -- highlight tints, "mark as opinion", and RTL block direction.
 */
const doc: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { dir: "auto" },
      content: [
        { type: "text", text: "Plain, then " },
        { type: "text", marks: [{ type: "bold" }], text: "bold" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "underline" }], text: "underline" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "strike" }], text: "strike" },
        { type: "text", text: ", " },
        {
          type: "text",
          marks: [{ type: "highlight", attrs: { color: "color-mix(in srgb, var(--brass) 15%, transparent)" } }],
          text: "highlighted",
        },
        { type: "text", text: ", and " },
        { type: "text", marks: [{ type: "opinion" }], text: "this is my opinion" },
        { type: "text", text: "." },
      ],
    },
    {
      type: "paragraph",
      attrs: { dir: "rtl" },
      content: [{ type: "text", text: "שלום, זהו טקסט בעברית מימין לשמאל." }],
    },
    {
      type: "paragraph",
      attrs: { dir: "auto" },
      content: [{ type: "text", text: "English auto-direction paragraph after the Hebrew one." }],
    },
  ],
};

export default function MarksPreview() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <TiptapReportRenderer json={doc} />
    </div>
  );
}
