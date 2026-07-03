import { Extension, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
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
 * it would overflow the viewport bottom. Avoids pulling in a positioning
 * library for one popup.
 */
function positionPopup(el: HTMLElement | null, rect: DOMRect | null) {
  if (!el || !rect) return;
  const margin = 8;
  el.style.left = `${rect.left}px`;
  const below = rect.bottom + margin;
  const wouldOverflow = below + el.offsetHeight > window.innerHeight;
  if (wouldOverflow) {
    el.style.top = `${rect.top - el.offsetHeight - margin}px`;
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
      popup.style.position = "fixed";
      popup.style.zIndex = "60";
      popup.appendChild(component.element);
      document.body.appendChild(popup);
      positionPopup(popup, props.clientRect?.() ?? null);
    },
    onUpdate: (props) => {
      if (!popup) return;
      component?.updateProps({ items: props.items, command: props.command });
      positionPopup(popup, props.clientRect?.() ?? null);
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
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }) => filterItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: suggestionRender,
      }),
    ];
  },
});
