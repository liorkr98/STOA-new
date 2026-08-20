import { cn } from "@/lib/design/cn";
import { TickerChip } from "@/components/ui/ticker-chip";
import type { EditorBlock } from "@/lib/editor/types";
import { parseMetricsItems } from "@/lib/editor/document";
import { MiniChart } from "@/components/editor/mini-chart";
import { FactCheckedText } from "@/components/report/fact-check-layer";
import type { FactClaim } from "@/lib/ai/fact-check";

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg/80 px-3 py-2 text-sm focus-ring";

export function BlockEditor({
  block,
  onChange,
  readOnly = false,
  claims,
  isAuthed = false,
}: {
  block: EditorBlock;
  onChange: (content: EditorBlock["content"]) => void;
  readOnly?: boolean;
  /** Only applied to "text" blocks -- the prose that fact-check claims anchor to. */
  claims?: FactClaim[];
  isAuthed?: boolean;
}) {
  const c = block.content;

  if (block.type === "heading") {
    if (readOnly) {
      return <h2 className="t-h2 font-semibold">{String(c.text ?? "")}</h2>;
    }
    return (
      <input
        value={String(c.text ?? "")}
        onChange={(e) => onChange({ ...c, text: e.target.value })}
        placeholder="Section heading"
        className="t-h2 w-full bg-transparent font-semibold placeholder:text-text-mute focus:outline-none"
      />
    );
  }

  if (block.type === "text") {
    const text = String(c.text ?? "");
    if (readOnly) {
      return (
        <div className="t-body-editorial whitespace-pre-wrap">
          {claims && claims.length > 0 ? (
            <FactCheckedText text={text} claims={claims} isAuthed={isAuthed} />
          ) : (
            text
          )}
        </div>
      );
    }
    return (
      <textarea
        value={text}
        onChange={(e) => onChange({ ...c, text: e.target.value })}
        rows={5}
        placeholder="Write your analysis..."
        className={cn(inputClass, "resize-y leading-relaxed")}
      />
    );
  }

  if (block.type === "callout") {
    const text = String(c.text ?? "");
    return (
      <div className="rounded-[var(--radius-btn)] border border-accent/30 bg-accent-weak/50 p-4">
        {readOnly ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
        ) : (
          <textarea
            value={text}
            onChange={(e) => onChange({ ...c, text: e.target.value })}
            rows={3}
            className="w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
          />
        )}
      </div>
    );
  }

  if (block.type === "chart") {
    const ticker = String(c.ticker ?? "NVDA").toUpperCase();
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {readOnly ? (
            <>
              <TickerChip ticker={ticker} />
              {c.caption && <span className="t-meta flex-1">{String(c.caption)}</span>}
            </>
          ) : (
            <>
              <input
                value={ticker}
                onChange={(e) => onChange({ ...c, ticker: e.target.value.toUpperCase() })}
                className={cn(inputClass, "num max-w-[120px]")}
                placeholder="Ticker"
              />
              <input
                value={String(c.caption ?? "")}
                onChange={(e) => onChange({ ...c, caption: e.target.value })}
                className={cn(inputClass, "flex-1")}
                placeholder="Caption"
              />
            </>
          )}
        </div>
        <MiniChart ticker={ticker} />
      </div>
    );
  }

  if (block.type === "thesis") {
    const bull = String(c.bull ?? "");
    const bear = String(c.bear ?? "");
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,var(--up)_35%,transparent)] bg-[color-mix(in_srgb,var(--up)_8%,transparent)] p-3">
          <p className="t-eyebrow mb-2 text-[var(--up)]">Bull case</p>
          {readOnly ? (
            <p className="whitespace-pre-wrap text-sm">{bull}</p>
          ) : (
            <textarea
              value={bull}
              onChange={(e) => onChange({ ...c, bull: e.target.value })}
              rows={4}
              className="w-full resize-none bg-transparent text-sm focus:outline-none"
            />
          )}
        </div>
        <div className="rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,var(--down)_35%,transparent)] bg-[color-mix(in_srgb,var(--down)_8%,transparent)] p-3">
          <p className="t-eyebrow mb-2 text-[var(--down)]">Bear case</p>
          {readOnly ? (
            <p className="whitespace-pre-wrap text-sm">{bear}</p>
          ) : (
            <textarea
              value={bear}
              onChange={(e) => onChange({ ...c, bear: e.target.value })}
              rows={4}
              className="w-full resize-none bg-transparent text-sm focus:outline-none"
            />
          )}
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
