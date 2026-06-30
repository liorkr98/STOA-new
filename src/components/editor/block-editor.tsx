import { cn } from "@/lib/design/cn";
import type { EditorBlock } from "@/lib/editor/types";
import { parseMetricsItems } from "@/lib/editor/document";
import { MiniChart } from "@/components/editor/mini-chart";

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg/80 px-3 py-2 text-sm focus-ring";

export function BlockEditor({
  block,
  onChange,
  readOnly = false,
}: {
  block: EditorBlock;
  onChange: (content: EditorBlock["content"]) => void;
  readOnly?: boolean;
}) {
  const c = block.content;

  if (block.type === "heading") {
    return (
      <input
        value={String(c.text ?? "")}
        onChange={(e) => onChange({ ...c, text: e.target.value })}
        readOnly={readOnly}
        placeholder="Section heading"
        className="t-h2 w-full bg-transparent font-semibold placeholder:text-text-faint focus:outline-none"
      />
    );
  }

  if (block.type === "text") {
    return (
      <textarea
        value={String(c.text ?? "")}
        onChange={(e) => onChange({ ...c, text: e.target.value })}
        readOnly={readOnly}
        rows={5}
        placeholder="Write your analysis..."
        className={cn(inputClass, "resize-y leading-relaxed")}
      />
    );
  }

  if (block.type === "callout") {
    return (
      <div className="rounded-[var(--radius-btn)] border border-accent/30 bg-accent-weak/50 p-4">
        <textarea
          value={String(c.text ?? "")}
          onChange={(e) => onChange({ ...c, text: e.target.value })}
          readOnly={readOnly}
          rows={3}
          className="w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
        />
      </div>
    );
  }

  if (block.type === "chart") {
    const ticker = String(c.ticker ?? "NVDA").toUpperCase();
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            value={ticker}
            onChange={(e) => onChange({ ...c, ticker: e.target.value.toUpperCase() })}
            readOnly={readOnly}
            className={cn(inputClass, "num max-w-[120px]")}
            placeholder="Ticker"
          />
          <input
            value={String(c.caption ?? "")}
            onChange={(e) => onChange({ ...c, caption: e.target.value })}
            readOnly={readOnly}
            className={cn(inputClass, "flex-1")}
            placeholder="Caption"
          />
        </div>
        <MiniChart ticker={ticker} />
      </div>
    );
  }

  if (block.type === "thesis") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,var(--up)_35%,transparent)] bg-[color-mix(in_srgb,var(--up)_8%,transparent)] p-3">
          <p className="t-eyebrow mb-2 text-[var(--up)]">Bull case</p>
          <textarea
            value={String(c.bull ?? "")}
            onChange={(e) => onChange({ ...c, bull: e.target.value })}
            readOnly={readOnly}
            rows={4}
            className="w-full resize-none bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,var(--down)_35%,transparent)] bg-[color-mix(in_srgb,var(--down)_8%,transparent)] p-3">
          <p className="t-eyebrow mb-2 text-[var(--down)]">Bear case</p>
          <textarea
            value={String(c.bear ?? "")}
            onChange={(e) => onChange({ ...c, bear: e.target.value })}
            readOnly={readOnly}
            rows={4}
            className="w-full resize-none bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>
    );
  }

  if (block.type === "metrics") {
    const items = parseMetricsItems(String(c.items ?? ""));
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((m, i) => (
          <div key={i} className="rounded-[var(--radius-btn)] border border-border bg-bg/50 p-3">
            <div className="t-meta">{m.label}</div>
            <div className="num mt-1 text-lg font-semibold">{m.value}</div>
          </div>
        ))}
        {!readOnly && (
          <input
            className={cn(inputClass, "col-span-full text-xs")}
            value={String(c.items ?? "")}
            onChange={(e) => onChange({ ...c, items: e.target.value })}
            placeholder="Label|Value|Label|Value (pipe-separated pairs)"
          />
        )}
      </div>
    );
  }

  if (block.type === "divider") {
    return <div className="rule-fade h-px w-full" />;
  }

  return null;
}
