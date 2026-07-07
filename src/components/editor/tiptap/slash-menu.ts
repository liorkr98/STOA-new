import { Extension, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import {
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Megaphone,
  Minus,
  ChartCandlestick,
  Sigma,
  Columns3,
  Table,
  Landmark,
  Target,
  LineChart,
  Link2,
  Image as ImageIcon,
  Calculator,
  BarChart2,
  Film,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { SlashMenuList, type SlashMenuListRef } from "./slash-menu-list";

export interface SlashItem {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  keywords: string[];
  group: "Text" | "Data";
  run: (editor: Editor, range: Range) => void;
}

/**
 * Text-block commands (Layer 2). Financial-node commands (Layer 3) get
 * appended to this array as each node lands, so the slash menu grows without
 * touching the extension wiring.
 */
export const SLASH_ITEMS: SlashItem[] = [
  {
    title: "Heading",
    subtitle: "Section heading",
    icon: Heading2,
    keywords: ["h2", "title", "section"],
    group: "Text",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Subheading",
    subtitle: "Smaller heading",
    icon: Heading3,
    keywords: ["h3", "sub"],
    group: "Text",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bulleted list",
    subtitle: "A simple list",
    icon: List,
    keywords: ["ul", "bullet", "unordered"],
    group: "Text",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    subtitle: "An ordered list",
    icon: ListOrdered,
    keywords: ["ol", "ordered", "number"],
    group: "Text",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Quote",
    subtitle: "Blockquote",
    icon: Quote,
    keywords: ["blockquote", "cite"],
    group: "Text",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Callout",
    subtitle: "One line of emphasis",
    icon: Megaphone,
    keywords: ["note", "highlight", "aside"],
    group: "Text",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("callout").run(),
  },
  {
    title: "Divider",
    subtitle: "Horizontal rule",
    icon: Minus,
    keywords: ["hr", "rule", "separator"],
    group: "Text",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Chart",
    subtitle: "Live price chart",
    icon: ChartCandlestick,
    keywords: ["chart", "price", "candles", "graph", "ohlc"],
    group: "Data",
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "chartNode", attrs: { ticker: "", range: "3M", kind: "area" } })
        .run(),
  },
  {
    title: "Figure",
    subtitle: "A single sourced number",
    icon: Sigma,
    keywords: ["figure", "stat", "metric", "number", "data"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "dataFigureNode" }).run(),
  },
  {
    title: "Peer comparison",
    subtitle: "Compare 2-4 tickers",
    icon: Columns3,
    keywords: ["compare", "peer", "versus", "vs", "comps"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "compareNode" }).run(),
  },
  {
    title: "Table",
    subtitle: "Data table",
    icon: Table,
    keywords: ["table", "grid", "data", "rows"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "financialTableNode" }).run(),
  },
  {
    title: "Financial statement",
    subtitle: "Income, balance, or cash flow from EDGAR",
    icon: Landmark,
    keywords: ["statement", "income", "balance", "cashflow", "financials", "10-k", "edgar", "sec"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "statementNode" }).run(),
  },
  {
    title: "Estimates",
    subtitle: "Consensus EPS vs actuals + price target",
    icon: Target,
    keywords: ["estimates", "consensus", "eps", "beat", "miss", "price target", "analyst"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "estimatesNode" }).run(),
  },
  {
    title: "Metric comparison",
    subtitle: "Chart a metric across 2-8 tickers over time",
    icon: LineChart,
    keywords: ["comparison", "metric", "revenue", "margin", "growth", "versus", "multi", "koyfin"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "comparisonNode" }).run(),
  },
  {
    title: "Embed",
    subtitle: "X, YouTube, or SEC link as a cited card",
    icon: Link2,
    keywords: ["embed", "link", "twitter", "x", "youtube", "video", "tweet", "sec", "url"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "embedNode" }).run(),
  },
  {
    title: "Image",
    subtitle: "Upload an image with a caption",
    icon: ImageIcon,
    keywords: ["image", "photo", "picture", "upload", "figure", "screenshot"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "imageNode" }).run(),
  },
  {
    title: "Napkin visual",
    subtitle: "AI diagram from your text (Napkin)",
    icon: Wand2,
    keywords: ["napkin", "visual", "diagram", "illustration", "flowchart", "mindmap", "ai", "spark"],
    group: "Data",
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "napkinNode", attrs: { sourceText: "" } })
        .run(),
  },
  {
    title: "Valuation (DCF)",
    subtitle: "Fair value, upside, and a sensitivity grid",
    icon: Calculator,
    keywords: ["valuation", "dcf", "fair value", "discounted", "intrinsic", "model"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "valuationNode" }).run(),
  },
  {
    title: "Scenario",
    subtitle: "Bull / base / bear probability-weighted target",
    icon: BarChart2,
    keywords: ["scenario", "bull", "bear", "base", "probability", "weighted", "target"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "scenarioNode" }).run(),
  },
  {
    title: "Video",
    subtitle: "Subscriber-gated video upload",
    icon: Film,
    keywords: ["video", "clip", "webinar", "stream", "upload", "media"],
    group: "Data",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "videoNode" }).run(),
  },
  {
    title: "Formula",
    subtitle: "KaTeX math block for valuation write-ups",
    icon: Sigma,
    keywords: ["math", "formula", "katex", "latex", "equation", "dcf"],
    group: "Data",
    run: (editor, range) => {
      const latex = window.prompt("LaTeX formula", "FV = \\sum_{t=1}^{N} \\frac{FCF_t}{(1+r)^t}");
      if (!latex) return;
      editor.chain().focus().deleteRange(range).insertBlockMath({ latex }).run();
    },
  },
];

function filterItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q)),
  );
}

/**
 * Position a floating element at the caret rect, flipping above the line when
 * it would overflow the viewport bottom. Falls back to ProseMirror coords when
 * the suggestion plugin cannot resolve a DOM rect (common in scroll containers).
 */
function caretRect(
  editor: Editor,
  clientRect: (() => DOMRect | null) | null | undefined,
): DOMRect | null {
  const rect = clientRect?.() ?? null;
  if (rect && rect.height > 0) return rect;
  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);
  return new DOMRect(coords.left, coords.top, 1, Math.max(coords.bottom - coords.top, 16));
}

function positionPopup(el: HTMLElement | null, rect: DOMRect | null) {
  if (!el || !rect) return;
  const margin = 8;
  el.style.left = `${Math.max(margin, rect.left)}px`;
  const below = rect.bottom + margin;
  const wouldOverflow = below + el.offsetHeight > window.innerHeight - margin;
  if (wouldOverflow) {
    el.style.top = `${Math.max(margin, rect.top - el.offsetHeight - margin)}px`;
  } else {
    el.style.top = `${below}px`;
  }
}

const suggestionRender: SuggestionOptions<SlashItem>["render"] = () => {
  let component: ReactRenderer<SlashMenuListRef> | null = null;
  let popup: HTMLDivElement | null = null;

  return {
    onStart: (props) => {
      component = new ReactRenderer(SlashMenuList, {
        props: { items: props.items, command: props.command },
        editor: props.editor,
      });
      popup = document.createElement("div");
      popup.setAttribute("role", "listbox");
      popup.setAttribute("aria-label", "Insert block");
      popup.style.position = "fixed";
      popup.style.zIndex = "250";
      popup.appendChild(component.element);
      document.body.appendChild(popup);
      positionPopup(popup, caretRect(props.editor, props.clientRect));
    },
    onUpdate: (props) => {
      if (!popup) return;
      component?.updateProps({ items: props.items, command: props.command });
      positionPopup(popup, caretRect(props.editor, props.clientRect));
    },
    onKeyDown: (props) => {
      if (props.event.key === "Escape") {
        popup?.remove();
        return true;
      }
      return component?.ref?.onKeyDown({ event: props.event }) ?? false;
    },
    onExit: () => {
      popup?.remove();
      popup = null;
      component?.destroy();
      component = null;
    },
  };
};

/**
 * The slash menu extension (Layer 2). Thin wrapper over @tiptap/suggestion:
 * the engine owns trigger detection and range tracking; we own the item list
 * and the popup, both in the six-token language.
 */
export const SlashMenu = Extension.create({
  name: "slashMenu",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        pluginKey: new PluginKey("slashMenu"),
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        allowedPrefixes: null,
        items: ({ query }) => filterItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: suggestionRender,
      }),
    ];
  },
});
