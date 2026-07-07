import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { Mathematics } from "@tiptap/extension-mathematics";
import type { Extensions } from "@tiptap/core";
import { Callout } from "./callout";
import { OpinionMark } from "./opinion-mark";
import { TickerMark } from "./ticker-mark";
import { Dir } from "./dir-attribute";
import { ChartNode } from "./nodes/chart-node";
import { DataFigureNode } from "./nodes/data-figure-node";
import { CompareNode } from "./nodes/compare-node";
import { FinancialTableNode } from "./nodes/financial-table-node";
import { StatementNode } from "./nodes/statement-node";
import { EstimatesNode } from "./nodes/estimates-node";
import { ComparisonNode } from "./nodes/comparison-node";
import { EmbedNode } from "./nodes/embed-node";
import { ImageNode } from "./nodes/image-node";
import { NapkinNode } from "./nodes/napkin-node";
import { ValuationNode } from "./nodes/valuation-node";
import { ScenarioNode } from "./nodes/scenario-node";
import { VideoNode } from "./nodes/video-node";

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
      // The drop indicator when dragging a block by its handle (Phase 1.1).
      dropcursor: { color: "var(--verdigris)", width: 2 },
    }),
    Callout,
    ChartNode,
    DataFigureNode,
    CompareNode,
    FinancialTableNode,
    StatementNode,
    EstimatesNode,
    ComparisonNode,
    EmbedNode,
    ImageNode,
    NapkinNode,
    ValuationNode,
    ScenarioNode,
    VideoNode,
    Highlight.configure({ multicolor: true }),
    OpinionMark,
    TickerMark,
    // KaTeX formulas (A11). CSS is imported at the two mount points
    // (tiptap-editor, report-renderer) so this module stays style-free.
    Mathematics,
    Dir,
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
