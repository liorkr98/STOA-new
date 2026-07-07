"use client";

import type { Editor } from "@tiptap/react";
import * as Popover from "@radix-ui/react-popover";
import { ChartCandlestick, ChevronDown, Layers, LineChart, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/design/cn";
import {
  insertVisualizedFromSelection,
  type EditorRange,
  type VisualizeMode,
} from "@/lib/editor/tiptap/chart-from-selection";
import { getEditorReportTicker } from "@/lib/editor/tiptap/editor-context";
import { toast } from "sonner";

function stopMouseDown(e: React.MouseEvent) {
  e.preventDefault();
}

const OPTIONS: {
  mode: VisualizeMode;
  title: string;
  hint: string;
  icon: typeof ChartCandlestick;
}[] = [
  {
    mode: "chart",
    title: "Price chart",
    hint: "Live chart with parsed levels",
    icon: LineChart,
  },
  {
    mode: "diagram",
    title: "Diagram",
    hint: "AI sketch from your selection",
    icon: Sparkles,
  },
  {
    mode: "both",
    title: "Chart + diagram",
    hint: "Chart and labeled level diagram",
    icon: Layers,
  },
];

/**
 * Visualize picker: choose chart, diagram, or both before inserting blocks.
 */
export function VisualizeSelectionMenu({
  editor,
  reportTicker,
  variant = "icon",
}: {
  editor: Editor;
  reportTicker?: string;
  variant?: "icon" | "button";
}) {
  const ticker = reportTicker ?? getEditorReportTicker();
  const savedRange = useRef<EditorRange | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const capture = () => {
      const { from, to } = editor.state.selection;
      if (from !== to && editor.isEditable && !editor.isActive("codeBlock")) {
        savedRange.current = { from, to };
      }
    };
    editor.on("selectionUpdate", capture);
    capture();
    return () => {
      editor.off("selectionUpdate", capture);
    };
  }, [editor]);

  function run(mode: VisualizeMode) {
    setOpen(false);
    const range = savedRange.current;
    const result = insertVisualizedFromSelection(editor, ticker, range, mode);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.warning) toast.warning(result.warning);

    if (mode === "chart") {
      toast.success(`${result.ticker ?? "Chart"} loading from your selection…`);
    } else if (mode === "diagram") {
      toast.success("Generating diagram from your selection…");
    } else {
      toast.success(
        `${result.ticker} chart loading — diagram drawing labeled levels (pick from 4 styles)…`,
      );
    }
  }

  const label = "Visualize selection";

  const triggerClass =
    variant === "button"
      ? "flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-2.5 text-xs font-medium text-text-mute transition-colors hover:text-text focus-ring"
      : cn(
          "flex h-8 items-center justify-center gap-1 rounded-[var(--radius-btn)] px-2 transition-colors focus-ring",
          "text-text-mute hover:bg-surface-2 hover:text-text",
        );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          onMouseDown={stopMouseDown}
          className={triggerClass}
        >
          <ChartCandlestick size={15} />
          <span className={variant === "button" ? "hidden sm:inline" : "hidden text-xs font-medium lg:inline"}>
            Visualize
          </span>
          <ChevronDown size={12} className="opacity-60" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-[270] w-56 rounded-[var(--radius-card)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <p className="t-meta px-2 py-1.5 text-[11px]">From your selection</p>
          {OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onMouseDown={stopMouseDown}
              onClick={() => run(opt.mode)}
              className="flex w-full items-start gap-2.5 rounded-[var(--radius-btn)] px-2 py-2 text-left transition-colors hover:bg-surface-2 focus-ring"
            >
              <opt.icon size={16} className="mt-0.5 shrink-0 text-accent" />
              <span>
                <span className="block text-sm font-medium">{opt.title}</span>
                <span className="t-meta text-[11px]">{opt.hint}</span>
              </span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
