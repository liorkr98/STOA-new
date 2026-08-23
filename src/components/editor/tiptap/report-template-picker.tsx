"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LayoutTemplate, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import {
  TEMPLATE_CATEGORIES,
  TIPTAP_REPORT_TEMPLATES,
  type TemplateCategory,
  type TiptapReportTemplate,
} from "@/lib/editor/tiptap/templates";

function TemplateWireframe({ preview }: { preview: string[] }) {
  return (
    <div
      className="flex h-[4.5rem] flex-col justify-end gap-1 rounded-[6px] border border-border bg-paper p-2"
      aria-hidden
    >
      {preview.slice(0, 5).map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            className="h-1 shrink-0 rounded-full bg-border-strong"
            style={{ width: `${48 + (i % 3) * 12}%` }}
          />
          <span className="sr-only">{label}</span>
        </div>
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  onSelect,
  index,
  reduced,
}: {
  template: TiptapReportTemplate;
  onSelect: () => void;
  index: number;
  reduced: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.18, ease: [0.23, 1, 0.32, 1], delay: index * 0.04 }
      }
      whileHover={reduced ? undefined : { y: -1 }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3 text-left",
        "transition-colors hover:border-border-strong hover:bg-surface-2 focus-ring",
      )}
    >
      <TemplateWireframe preview={template.preview} />
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-text">{template.name}</p>
          <span className="t-meta shrink-0 text-[10px]">{template.length}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-mute">
          {template.description}
        </p>
      </div>
    </motion.button>
  );
}

export function ReportTemplatePicker({
  open,
  onClose,
  ticker,
  onApply,
  anchor = "compose",
}: {
  open: boolean;
  onClose: () => void;
  ticker?: string;
  onApply: (templateId: string) => void | Promise<void>;
  anchor?: "compose" | "ai";
}) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered =
    category === "all"
      ? TIPTAP_REPORT_TEMPLATES
      : TIPTAP_REPORT_TEMPLATES.filter((t) => t.category === category);

  async function pick(id: string) {
    setApplying(id);
    try {
      await onApply(id);
      onClose();
    } finally {
      setApplying(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close templates"
            className="fixed inset-0 z-50 bg-[var(--ink)]/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.08 : 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Report templates"
            className={cn(
              "fixed z-50 flex max-h-[min(88svh,720px)] w-[min(560px,calc(100svw-1.5rem))] flex-col overflow-hidden",
              "rounded-[var(--radius-card)] border border-border bg-paper shadow-[var(--shadow-card)]",
              anchor === "compose"
                ? "left-1/2 top-[12%] -translate-x-1/2"
                : "bottom-0 left-1/2 w-full max-w-none -translate-x-1/2 rounded-b-none sm:bottom-auto sm:top-[10%] sm:max-w-[560px] sm:rounded-b-[var(--radius-card)]",
            )}
            initial={reduced ? false : { opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: reduced ? 0.08 : 0.24, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: "top center" }}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <LayoutTemplate size={16} className="text-text-mute" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">Report templates</p>
                <p className="text-[11px] text-text-mute">
                  {ticker
                    ? `Wire blocks to ${ticker.toUpperCase()} · edit every section after applying`
                    : "Set a ticker in the call panel for live data blocks"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-[var(--radius-btn)] p-1.5 text-text-faint hover:text-text focus-ring"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
              {TEMPLATE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "shrink-0 rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors focus-ring",
                    category === c.id
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "text-text-mute hover:bg-surface-2 hover:text-text",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="scroll-area flex-1 overflow-y-auto p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {filtered.map((t, i) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    index={i}
                    reduced={!!reduced}
                    onSelect={() => void pick(t.id)}
                  />
                ))}
              </div>
              {applying && (
                <p className="t-meta mt-3 text-center text-[11px]" role="status">
                  Applying template…
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Compact strip shown on empty compose drafts */
export function ReportTemplateStrip({
  ticker,
  onApply,
}: {
  ticker?: string;
  onApply: (templateId: string) => void | Promise<void>;
}) {
  const reduced = useReducedMotion();
  const featured = TIPTAP_REPORT_TEMPLATES.filter((t) =>
    ["initiating-coverage", "equity-factsheet", "earnings-recap", "comp-analysis"].includes(t.id),
  );

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.08 : 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="mb-6 rounded-[var(--radius-card)] border border-border bg-surface-2 p-4"
    >
      <p className="t-eyebrow mb-1 text-[10px]">Start from a template</p>
      <p className="mb-3 text-sm text-text-mute">
        Institutional layouts with live charts, financials, and valuation blocks. You edit every
        section after applying.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {featured.map((t, i) => (
          <TemplateCard
            key={t.id}
            template={t}
            index={i}
            reduced={!!reduced}
            onSelect={() => void onApply(t.id)}
          />
        ))}
      </div>
    </motion.div>
  );
}
