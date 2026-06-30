"use client";

import { Layout, Sparkle } from "@phosphor-icons/react";
import { REPORT_TEMPLATES } from "@/lib/editor/templates";
import type { EditorBlock } from "@/lib/editor/types";
import { cn } from "@/lib/design/cn";

export function TemplatesPanel({
  onApply,
}: {
  onApply: (blocks: EditorBlock[], templateType: "research" | "call") => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Layout size={16} className="text-accent" />
        <p className="t-eyebrow">Templates</p>
      </div>
      <p className="t-meta px-1">One-click structures. Free to apply.</p>
      <div className="flex flex-col gap-2">
        {REPORT_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onApply(t.blocks(), t.type)}
            className={cn(
              "rounded-[var(--radius-btn)] border border-border bg-bg/40 px-3 py-2.5 text-left transition-colors",
              "hover:border-accent/40 hover:bg-accent-weak/30",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {t.name}
              <Sparkle size={12} className="text-accent opacity-60" />
            </span>
            <span className="t-meta mt-0.5 block">{t.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
