"use client";

import * as Popover from "@radix-ui/react-popover";
import type { Editor } from "@tiptap/react";
import { ChartCandlestick, Layers, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/design/cn";
import { insertChartFromEditorSelection, insertVisualBundleFromSelection } from "@/lib/editor/tiptap/chart-from-selection";
import { getEditorReportTicker } from "@/lib/editor/tiptap/editor-context";
import { insertNapkinFromEditorSelection } from "@/lib/editor/tiptap/napkin-insert";
import { toast } from "sonner";

/**
 * Unified "Visualize selection" menu — chart (TradingView-style via lightweight-charts)
 * and Napkin diagram from the same highlighted prose.
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
  const [open, setOpen] = useState(false);
  const ticker = reportTicker ?? getEditorReportTicker();

  function run(fn: () => string | null, success?: string) {
    const err = fn();
    if (err) toast.error(err);
    else if (success) toast.success(success);
    setOpen(false);
  }

  const trigger =
    variant === "button" ? (
      <button
        type="button"
        className="flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-2.5 text-xs font-medium text-text-mute transition-colors hover:text-text focus-ring"
      >
        <Sparkles size={15} />
        <span className="hidden sm:inline">Visualize</span>
      </button>
    ) : (
      <button
        type="button"
        aria-label="Visualize selection"
        title="Visualize selection"
        className={cn(
          "flex h-8 items-center justify-center gap-1 rounded-[var(--radius-btn)] px-2 transition-colors focus-ring",
          "text-text-mute hover:bg-surface-2 hover:text-text",
        )}
      >
        <Sparkles size={15} />
        <span className="hidden text-xs font-medium lg:inline">Visualize</span>
      </button>
    );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="popover-content z-[260] w-64 overflow-hidden rounded-[var(--r-card)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="t-eyebrow px-2.5 pb-1 pt-2 text-[10px]">From your selection</p>
          <MenuItem
            icon={ChartCandlestick}
            title="Price chart"
            subtitle="Ticker, levels, RSI/SMA from your text"
            onClick={() =>
              run(
                () => insertChartFromEditorSelection(editor, ticker),
                "Chart inserted — levels and indicators parsed from your text",
              )
            }
          />
          <MenuItem
            icon={Wand2}
            title="Napkin diagram"
            subtitle="AI illustration of your thesis"
            onClick={() =>
              run(
                () => insertNapkinFromEditorSelection(editor),
                "Generating Napkin visual…",
              )
            }
          />
          <MenuItem
            icon={Layers}
            title="Chart + diagram"
            subtitle="Both blocks below your selection"
            onClick={() =>
              run(
                () => insertVisualBundleFromSelection(editor, ticker),
                "Chart and Napkin blocks inserted",
              )
            }
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MenuItem({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-[var(--radius-btn)] px-2.5 py-2 text-left transition-colors hover:bg-surface-2 focus-ring"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-btn)] border border-border text-accent">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text">{title}</span>
        <span className="block text-xs text-text-faint">{subtitle}</span>
      </span>
    </button>
  );
}
