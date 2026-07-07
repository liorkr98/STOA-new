"use client";

import type { Editor } from "@tiptap/react";
import { ChartCandlestick, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/design/cn";
import {
  insertVisualizedChartFromSelection,
  type EditorRange,
} from "@/lib/editor/tiptap/chart-from-selection";
import { getEditorReportTicker } from "@/lib/editor/tiptap/editor-context";
import { toast } from "sonner";

function stopMouseDown(e: React.MouseEvent) {
  e.preventDefault();
}

/**
 * One-click visualize: pulls a TradingView-style live chart with parsed levels,
 * then Napkin generates labeled chart diagrams (4 variations to pick from).
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

  function visualize() {
    const range = savedRange.current;
    const result = insertVisualizedChartFromSelection(editor, ticker, range);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.warning) toast.warning(result.warning);
    toast.success(
      `${result.ticker} chart loading — Napkin is drawing labeled support/resistance lines (pick from 4 styles)…`,
    );
  }

  const label = "Visualize on chart";

  if (variant === "button") {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onMouseDown={stopMouseDown}
        onClick={visualize}
        className="flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-2.5 text-xs font-medium text-text-mute transition-colors hover:text-text focus-ring"
      >
        <Sparkles size={15} />
        <span className="hidden sm:inline">Visualize</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title="TradingView chart + Napkin level lines from your selection"
      onMouseDown={stopMouseDown}
      onClick={visualize}
      className={cn(
        "flex h-8 items-center justify-center gap-1 rounded-[var(--radius-btn)] px-2 transition-colors focus-ring",
        "text-text-mute hover:bg-surface-2 hover:text-text",
      )}
    >
      <ChartCandlestick size={15} />
      <span className="hidden text-xs font-medium lg:inline">Visualize</span>
    </button>
  );
}
