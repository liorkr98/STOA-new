import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { Extensions } from "@tiptap/core";
import { Callout } from "./callout";

/**
 * The single Tiptap extension set, shared by the editor and the read-only
 * report renderer so a document renders identically in both (docs
 * Compose-Deep-Dive 1.3). Financial nodes (Layer 3) get appended here as
 * they land; keeping one builder is what guarantees editor/reader parity.
 *
 * Pure module (no React) so it can be imported from any client component.
 */
export function buildExtensions({
  editable = true,
}: { editable?: boolean } = {}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      // The report headline is the page title field, not an in-body H1.
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow" },
      },
    }),
    Callout,
    ...(editable
      ? [
          Placeholder.configure({
            placeholder: ({ node }) =>
              node.type.name === "heading"
                ? "Section heading"
                : "Write your analysis, or press / for blocks and data",
            includeChildren: false,
          }),
        ]
      : []),
  ];
}
