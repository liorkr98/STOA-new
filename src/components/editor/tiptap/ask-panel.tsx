"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import {
  Sparkle,
  X,
  ArrowRight,
  ChartCandlestick,
  Quote,
  GripVertical,
  Landmark,
  Target,
  LineChart,
  Calculator,
  Wand2,
  CheckCircle2,
  Plus,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/design/cn";
import { buttonClass } from "@/components/ui/button";
import type { ComposeAgentAction } from "@/lib/ai/compose-actions";
import {
  executeComposeActions,
  type ComposeEditorContext,
} from "@/lib/editor/tiptap/compose-agent";
import { detectTicker, detectTickers } from "@/lib/editor/tiptap/ticker-detect";
import { getTiptapTemplate } from "@/lib/editor/tiptap/templates";
import { ReportTemplatePicker } from "@/components/editor/tiptap/report-template-picker";

interface ResultCard {
  kind: string;
  icon: LucideIcon;
  label: string;
  subtitle: string;
  node: JSONContent;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  cards?: ResultCard[];
  applied?: string[];
  actionErrors?: string[];
}

function textCard(reply: string): ResultCard {
  return {
    kind: "text",
    icon: Quote,
    label: "Summary callout",
    subtitle: "Drop into the report",
    node: { type: "callout", content: [{ type: "text", text: reply.slice(0, 600) }] },
  };
}

function chartCard(ticker: string): ResultCard {
  return {
    kind: "chart",
    icon: ChartCandlestick,
    label: `${ticker} chart`,
    subtitle: "Live price block",
    node: { type: "chartNode", attrs: { ticker, range: "3M", kind: "area" } },
  };
}

function statementCard(ticker: string): ResultCard {
  return {
    kind: "statement",
    icon: Landmark,
    label: `${ticker} financials`,
    subtitle: "EDGAR statement",
    node: { type: "statementNode", attrs: { ticker, kind: "income", years: 5 } },
  };
}

function estimatesCard(ticker: string): ResultCard {
  return {
    kind: "estimates",
    icon: Target,
    label: `${ticker} estimates`,
    subtitle: "Consensus vs actuals",
    node: { type: "estimatesNode", attrs: { ticker } },
  };
}

function comparisonCard(symbols: string[]): ResultCard {
  return {
    kind: "comparison",
    icon: LineChart,
    label: `Compare ${symbols.slice(0, 3).join(", ")}`,
    subtitle: "Metric over time",
    node: {
      type: "comparisonNode",
      attrs: { symbols, metric: "revenue", years: 5, kind: "line" },
    },
  };
}

function valuationCard(ticker: string): ResultCard {
  return {
    kind: "valuation",
    icon: Calculator,
    label: `${ticker} valuation`,
    subtitle: "DCF scaffold",
    node: { type: "valuationNode", attrs: { ticker } },
  };
}

function DraggableCard({
  card,
  onInsert,
  compact,
}: {
  card: ResultCard;
  onInsert: (n: JSONContent) => void;
  compact?: boolean;
}) {
  const Icon = card.icon;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/stoa-node", JSON.stringify(card.node));
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={cn(
        "group flex cursor-grab items-center gap-2 rounded-[var(--radius-btn)] border border-border bg-paper transition-colors",
        "hover:border-border-strong hover:bg-surface-2 active:cursor-grabbing",
        compact ? "p-2" : "p-2.5",
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-surface-2 text-text">
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium leading-tight text-text">{card.label}</span>
        <span className="block truncate text-[10px] text-text-faint">{card.subtitle}</span>
      </span>
      <span className="hidden items-center gap-0.5 text-[10px] uppercase tracking-wide text-text-faint group-hover:flex">
        <GripVertical size={11} />
        Drag
      </span>
      <button
        type="button"
        onClick={() => onInsert(card.node)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] font-medium focus-ring",
          "bg-[var(--ink)] text-[var(--paper)] hover:opacity-90",
        )}
        aria-label={`Insert ${card.label}`}
      >
        <Plus size={12} />
        Insert
      </button>
    </div>
  );
}

/**
 * Compose agent panel — structured AI actions execute slash-menu blocks,
 * templates, diagrams, and selection edits directly in the report.
 */
export function AskPanel({
  open,
  onClose,
  context,
  credits,
  onCreditsChange,
  onInsertNode,
  editor,
  getEditorContext,
  onApplyTemplate,
  seed,
}: {
  open: boolean;
  onClose: () => void;
  context: { title?: string; ticker?: string };
  credits: number;
  onCreditsChange?: (n: number) => void;
  onInsertNode: (node: JSONContent) => void;
  editor: Editor | null;
  getEditorContext: () => ComposeEditorContext & {
    documentExcerpt?: string;
    title?: string;
    ticker?: string;
  };
  onApplyTemplate?: (templateId: string) => void | Promise<void>;
  /** Prompt the rail asked for. Pre-filled rather than sent, so the analyst
   *  sees what is about to be spent before a paid tool runs. */
  seed?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  // The seed the input was filled from, so a prompt sent from the rail lands
  // in the box once and never overwrites what the analyst types after it.
  const [seeded, setSeeded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (open && seed && seed !== seeded) {
    setSeeded(seed);
    setInput(seed);
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);



  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function applyTemplate(id: string) {
    if (onApplyTemplate) {
      await onApplyTemplate(id);
      const tpl = getTiptapTemplate(id);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Applied “${tpl?.name ?? id}” scaffold. Fill the placeholders with your analysis.`,
          applied: [`Template: ${id}`],
        },
      ]);
      return;
    }
  }

  function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || pending) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    start(async () => {
      try {
        const editorCtx = getEditorContext();
        const res = await fetch("/api/ai/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
            context: {
              ticker: context.ticker ?? editorCtx.reportTicker,
              title: context.title ?? editorCtx.title,
              documentExcerpt: editorCtx.documentExcerpt,
              selection: editorCtx.selection,
            },
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          actions?: ComposeAgentAction[];
          error?: string;
          have?: number;
          need?: number;
          credits_remaining?: number;
          market?: { peers?: string[]; ticker?: string } | null;
        };
        if (!res.ok) {
          setError(
            res.status === 402
              ? `Need ${data.need} credits (you have ${data.have}).`
              : data.error ?? "AI request failed",
          );
          return;
        }
        setError(null);
        if (typeof data.credits_remaining === "number") onCreditsChange?.(data.credits_remaining);

        let applied: string[] = [];
        let actionErrors: string[] = [];
        if (editor && data.actions?.length) {
          const result = executeComposeActions(editor, data.actions, {
            ...editorCtx,
            peers: data.market?.peers,
          });
          applied = result.applied;
          actionErrors = result.errors;
        }

        const cards: ResultCard[] = [];
        if (data.reply && !applied.some((a) => a.toLowerCase().includes("callout"))) {
          cards.push(textCard(data.reply));
        }
        const ticker = detectTicker(text, context.ticker ?? data.market?.ticker);
        const peers = data.market?.peers ?? [];
        if (
          /chart|price|graph/i.test(text) &&
          ticker &&
          !applied.some((a) => a.toLowerCase().includes("chart"))
        ) {
          cards.push(chartCard(ticker));
        }
        if (/statement|financials|10-?k|filing/i.test(text) && ticker) cards.push(statementCard(ticker));
        if (/estimate|consensus|\beps\b/i.test(text) && ticker) cards.push(estimatesCard(ticker));
        if (/compar|versus|\bvs\b|peers?/i.test(text)) {
          const symbols =
            peers.length && ticker
              ? [ticker, ...peers].slice(0, 4)
              : detectTickers(text, context.ticker);
          if (symbols.length) cards.push(comparisonCard(symbols));
        }
        if (/valuation|\bdcf\b|fair value/i.test(text) && ticker) cards.push(valuationCard(ticker));

        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: (data.reply ?? "Done.")
              .replace(/```[\s\S]*?```/g, "")
              .replace(/\bOpenNapkin\b/gi, "diagram")
              .replace(/\bnapkin\b/gi, "diagram")
              .trim() || "Done.",
            cards: cards.length ? cards : undefined,
            applied: applied.length ? applied : undefined,
            actionErrors: actionErrors.length ? actionErrors : undefined,
          },
        ]);
      } catch {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Could not reach AI. Check your connection." },
        ]);
      }
    });
  }

  const quick = [
    "Apply equity factsheet template",
    "Insert financials and peer comparison",
    "Add a diagram of revenue trend",
  ];

  if (!open) return null;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col border-l border-border bg-surface pt-[var(--safe-top)] pb-[var(--safe-bottom)]",
        "shadow-[var(--shadow-card)]",
      )}
      role="dialog"
      aria-label="Research AI"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Sparkle size={15} className="text-accent" />
        <p className="text-sm font-semibold">Research AI</p>
        <span className="t-meta text-[11px]">{credits} credits</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap-target ml-auto rounded-[var(--r-tag)] p-1 text-text-faint transition-colors hover:text-text focus-ring"
        >
          <X size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="scroll-area flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-text-mute">
            Ask me to draft sections, insert live data blocks, or build a diagram. Highlight text
            first for rewrite / visualize. Set the ticker in the call panel so blocks wire correctly.
            </p>
            <div>
              <p className="t-eyebrow mb-1.5 flex items-center gap-1 text-[10px]">
                <FileText size={11} /> Report templates
              </p>
              <button
                type="button"
                onClick={() => setTemplateOpen(true)}
                className="flex w-full items-center justify-between rounded-[var(--radius-btn)] border border-border bg-paper px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2 focus-ring"
              >
                <span>
                  <span className="block text-[12px] font-medium text-text">Browse templates</span>
                  <span className="block text-[10px] text-text-faint">
                    11 layouts: coverage, factsheet, comps, earnings, and more
                  </span>
                </span>
                <ArrowRight size={14} className="shrink-0 text-text-faint" />
              </button>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div
              className={cn(
                "rounded-[var(--radius-btn)] px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-6 bg-[var(--ink)] text-[var(--paper)]"
                  : "mr-1 border border-border bg-bg text-text",
              )}
            >
              {m.content}
            </div>
            {m.applied && m.applied.length > 0 && (
              <div className="mr-1 rounded-[var(--radius-btn)] border border-border bg-surface-2 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-text">
                  <CheckCircle2 size={13} />
                  Applied in your report
                </p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-text-mute">
                  {m.applied.map((a) => (
                    <li key={a}>· {a}</li>
                  ))}
                </ul>
              </div>
            )}
            {m.actionErrors && m.actionErrors.length > 0 && (
              <p className="mr-1 text-[11px] text-[var(--rust)]">{m.actionErrors.join(" · ")}</p>
            )}
            {m.cards && m.cards.length > 0 && (
              <div className="mr-1 flex flex-col gap-1.5">
                <p className="t-meta flex items-center gap-1 px-1 text-[10px]">
                  <Wand2 size={11} /> Drag or insert
                </p>
                {m.cards.map((c, j) => (
                  <DraggableCard key={j} card={c} onInsert={onInsertNode} compact />
                ))}
              </div>
            )}
          </div>
        ))}
        {pending && <p className="t-meta animate-pulse px-1">Thinking…</p>}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              disabled={pending}
              className="rounded-[6px] border border-border bg-bg px-2 py-1 text-[10px] text-text-mute transition-colors hover:border-border-strong hover:text-text focus-ring disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        {error && (
          <p
            className="mb-2 rounded-[var(--radius-btn)] border border-border bg-surface-2 px-2.5 py-2 text-[11px] text-text-mute"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex gap-1.5">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask Research AI…"
            className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-border bg-bg px-2.5 py-1.5 text-sm focus-ring placeholder:text-text-mute"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={pending}
            className={buttonClass("primary", "sm")}
            aria-label="Send"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <ReportTemplatePicker
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        ticker={context.ticker}
        onApply={applyTemplate}
        anchor="ai"
      />
    </aside>
  );
}
