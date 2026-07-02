"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FloppyDisk, RocketLaunch } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import { publishReport, saveDraft } from "@/app/actions/reports";
import {
  createBlock,
  documentPlainText,
  emptyDocument,
  parseDocument,
  serializeDocument,
} from "@/lib/editor/document";
import type { BlockType, ReportDocument } from "@/lib/editor/types";
import type { AccessType, ContentType, Direction, Report } from "@/lib/types";
import { BlockCanvas } from "@/components/editor/block-canvas";
import { BlockPalette } from "@/components/editor/block-palette";
import { AiSidebar } from "@/components/editor/ai-sidebar";
import { TemplatesPanel } from "@/components/editor/templates-panel";
import { FactCheckerPanel } from "@/components/editor/fact-checker-panel";
import { PredictionCardPreview } from "@/components/editor/prediction-preview";
import type { FactCheckResult } from "@/lib/ai/fact-check";

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg/60 px-3 py-2 text-sm focus-ring";

const types: { key: ContentType; label: string }[] = [
  { key: "research", label: "Research" },
  { key: "call", label: "Call" },
  { key: "short_post", label: "Post" },
];

export function StudioEditor({
  analystReportPrice,
  initialDraft,
  aiCredits = 0,
}: {
  analystReportPrice: number | null;
  initialDraft?: Report | null;
  aiCredits?: number;
}) {
  const initialDoc = initialDraft?.body
    ? parseDocument(initialDraft.body)
    : emptyDocument();

  const [type, setType] = useState<ContentType>(initialDraft?.type ?? "research");
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [summary, setSummary] = useState(initialDraft?.summary ?? "");
  const [doc, setDoc] = useState<ReportDocument>(initialDoc);
  const [ticker, setTicker] = useState(initialDraft?.ticker ?? "");
  const [direction, setDirection] = useState<Direction>("long");
  const [target, setTarget] = useState("");
  const [horizon] = useState(30);
  const [access, setAccess] = useState<AccessType>(initialDraft?.access ?? "free");
  const [price, setPrice] = useState(initialDraft?.price ?? analystReportPrice ?? 7);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraft?.id);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [credits, setCredits] = useState(aiCredits);
  const [factCheck, setFactCheck] = useState<FactCheckResult | null>(
    (initialDraft?.fact_check_results as FactCheckResult | null) ?? null,
  );
  const [pending, start] = useTransition();
  const [savingDraft, startDraft] = useTransition();

  const hasCard = type !== "short_post";
  const bodyJson = serializeDocument(doc);

  const persistDraft = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await saveDraft({
        id: draftId,
        type,
        title: type === "short_post" ? undefined : title,
        summary: summary || documentPlainText(doc).slice(0, 280),
        body: type === "short_post" ? undefined : bodyJson,
        access,
        price: access === "paid" ? Number(price) : null,
        ticker: hasCard ? ticker : null,
        direction: hasCard ? direction : undefined,
        target_price: hasCard && target ? Number(target) : null,
        horizon_days: hasCard ? horizon : undefined,
      });
      setDraftId(res.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, [
    draftId,
    type,
    title,
    summary,
    bodyJson,
    doc,
    access,
    price,
    ticker,
    direction,
    target,
    horizon,
    hasCard,
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      if (summary.trim() || doc.blocks.some((b) => String(b.content.text ?? "").trim())) {
        void persistDraft();
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [persistDraft, summary, doc]);

  function addBlock(blockType: BlockType) {
    setDoc((d) => ({ ...d, blocks: [...d.blocks, createBlock(blockType)] }));
  }

  function applyTemplate(blocks: ReportDocument["blocks"], templateType: ContentType) {
    setDoc({ version: 1, blocks });
    if (templateType === "call" || templateType === "research") {
      setType(templateType);
    }
  }

  const plainText = documentPlainText(doc);

  function onCanvasDrop(e: React.DragEvent) {
    const blockType = e.dataTransfer.getData("application/stoa-block") as BlockType;
    if (blockType) {
      e.preventDefault();
      addBlock(blockType);
    }
  }

  function onPublish() {
    setError(null);
    if (hasCard && !ticker.trim()) {
      setError("Add a ticker for research and calls.");
      return;
    }
    if (!summary.trim() && type === "short_post") {
      setError("Add a summary for your post.");
      return;
    }
    start(async () => {
      try {
        await publishReport({
          id: draftId,
          type,
          title: type === "short_post" ? undefined : title,
          summary: summary || plainText.slice(0, 280),
          body: type === "short_post" ? undefined : bodyJson,
          access,
          price: access === "paid" ? Number(price) : null,
          ticker: hasCard ? ticker : null,
          direction: hasCard ? direction : undefined,
          target_price: hasCard && target ? Number(target) : null,
          horizon_days: hasCard ? horizon : undefined,
          fact_check_results: factCheck as unknown as Record<string, unknown> | null,
        });
      } catch (e) {
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) {
          setError(e.message);
        }
      }
    });
  }

  return (
    <div
      className="dark surface flex min-h-[calc(100dvh-2rem)] flex-col gap-4 p-1 md:p-2"
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-card)] border border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="t-eyebrow text-accent">Compose</span>
          <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-bg/50 p-0.5">
            {types.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={cn(
                  "rounded-[6px] px-3 py-1 text-xs font-medium transition-colors",
                  type === t.key ? "bg-accent text-accent-ink" : "text-text-mute hover:text-text",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {saveStatus !== "idle" && (
            <span className="t-meta">{saveStatus === "saving" ? "Saving..." : "Draft saved"}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={savingDraft}
            onClick={() => startDraft(() => persistDraft())}
          >
            <FloppyDisk size={16} />
            Save
          </Button>
          <Button size="sm" disabled={pending} onClick={onPublish}>
            <RocketLaunch size={16} weight="fill" />
            {pending ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[200px_1fr_300px]">
        {/* Palette */}
        <div className="hidden max-h-[calc(100dvh-12rem)] space-y-6 overflow-y-auto rounded-[var(--r-card)] border border-border bg-surface-2 p-3 lg:block">
          <TemplatesPanel onApply={applyTemplate} />
          <BlockPalette onAdd={addBlock} />
        </div>

        {/* Canvas */}
        <div
          className="scroll-area flex min-h-0 flex-col gap-4 overflow-y-auto px-2 pb-4 lg:px-4"
          onDrop={onCanvasDrop}
        >
          {type !== "short_post" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="t-display w-full bg-transparent text-3xl font-semibold placeholder:text-text-faint focus:outline-none"
            />
          )}
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={type === "short_post" ? "What's on your mind?" : "One-line summary for feeds"}
            className={cn(inputClass, "text-base")}
          />

          {type !== "short_post" ? (
            <BlockCanvas blocks={doc.blocks} onChange={(blocks) => setDoc({ ...doc, blocks })} />
          ) : null}

          {hasCard && (
            <div className="rounded-[var(--r-card)] border border-border bg-surface-2 p-4">
              <p className="t-eyebrow mb-3">Investment card</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Ticker
                  <input
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className={cn(inputClass, "num mt-1")}
                    placeholder="NVDA"
                  />
                </label>
                <label className="text-sm">
                  Target (optional)
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    type="number"
                    className={cn(inputClass, "num mt-1")}
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                {(["long", "short", "hold"] as Direction[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={cn(
                      "flex-1 rounded-[var(--radius-btn)] border py-1.5 text-xs capitalize",
                      direction === d ? "border-accent bg-accent-weak text-accent" : "border-border",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {ticker && (
                <div className="mt-4">
                  <PredictionCardPreview ticker={ticker} direction={direction} target={target} />
                </div>
              )}
            </div>
          )}

          <div className="rounded-[var(--r-card)] border border-border bg-surface-2 p-4">
            <p className="t-eyebrow mb-2">Access</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {(["free", "subscribers", "paid"] as AccessType[]).map((a) => (
                <label key={a} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={access === a}
                    onChange={() => setAccess(a)}
                    className="accent-[var(--accent)]"
                  />
                  {a}
                </label>
              ))}
            </div>
            {access === "paid" && (
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={cn(inputClass, "num mt-2 max-w-[120px]")}
              />
            )}
          </div>

          {error && <p className="text-sm text-[var(--down)]">{error}</p>}
        </div>

        {/* AI + Fact-check */}
        <div className="hidden min-h-[400px] flex-col gap-3 lg:flex lg:min-h-0">
          <div className="min-h-0 flex-1">
            <AiSidebar
              context={{ title, ticker, type }}
              credits={credits}
              onCreditsChange={setCredits}
              onInsertBlocks={(types) => types.forEach(addBlock)}
            />
          </div>
          {type !== "short_post" && (
            <FactCheckerPanel
              text={plainText}
              credits={credits}
              initialResult={factCheck}
              onCreditsChange={setCredits}
              onResult={setFactCheck}
            />
          )}
        </div>
      </div>
    </div>
  );
}
