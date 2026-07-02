"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FloppyDisk, Plus } from "@phosphor-icons/react";
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
import { BLOCK_META, type BlockType, type ReportDocument } from "@/lib/editor/types";
import type { AccessType, ContentType, Direction, Report } from "@/lib/types";
import { BlockCanvas } from "@/components/editor/block-canvas";
import { BlockPalette } from "@/components/editor/block-palette";
import { TemplatesPanel } from "@/components/editor/templates-panel";
import { AiDock } from "@/components/editor/ai-dock";
import {
  LockPublishPanel,
  disclosuresAnswered,
  type DisclosureState,
} from "@/components/editor/lock-publish-panel";
import { LockConfirmModal } from "@/components/ui/lock-confirm-modal";
import type { FactCheckResult } from "@/lib/ai/fact-check";

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
  const [horizon, setHorizon] = useState(30);
  const [access, setAccess] = useState<AccessType>(initialDraft?.access ?? "free");
  const [price, setPrice] = useState(initialDraft?.price ?? analystReportPrice ?? 7);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraft?.id);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [credits, setCredits] = useState(aiCredits);
  const [factCheck, setFactCheck] = useState<FactCheckResult | null>(
    (initialDraft?.fact_check_results as FactCheckResult | null) ?? null,
  );
  const [disclosure, setDisclosure] = useState<DisclosureState>({
    positionHeld: null,
    compTied: null,
    compDetail: "",
    viewsCertified: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, start] = useTransition();
  const [savingDraft, startDraft] = useTransition();

  const hasCard = type !== "short_post";
  const bodyJson = serializeDocument(doc);
  const plainText = documentPlainText(doc);

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

  function onCanvasDrop(e: React.DragEvent) {
    const blockType = e.dataTransfer.getData("application/stoa-block") as BlockType;
    if (blockType) {
      e.preventDefault();
      addBlock(blockType);
    }
  }

  // The first unmet publish requirement, or null when ready. Mirrors the
  // server-side enforcement in publishReport; the panel shows it under the
  // disabled button so the author always knows what is left.
  const publishBlockedBy: string | null = (() => {
    if (type === "short_post") {
      return summary.trim() ? null : "Write your post first.";
    }
    if (!ticker.trim()) return "Add a ticker in the price target module.";
    if (plainText.trim() && !factCheck) return "Run the fact-check on your draft.";
    if (!disclosuresAnswered(disclosure)) return "Answer all three disclosures.";
    return null;
  })();

  const doPublish = useCallback(() => {
    setError(null);
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
          ...(hasCard
            ? {
                position_held: disclosure.positionHeld ?? false,
                compensation_tied: disclosure.compTied ?? false,
                compensation_detail: disclosure.compDetail || undefined,
                views_certified: disclosure.viewsCertified,
              }
            : {}),
        });
      } catch (e) {
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) {
          setError(e.message);
          setConfirmOpen(false);
        }
      }
    });
  }, [
    draftId,
    type,
    title,
    summary,
    plainText,
    bodyJson,
    access,
    price,
    hasCard,
    ticker,
    direction,
    target,
    horizon,
    factCheck,
    disclosure,
  ]);

  function onPublishClick() {
    if (publishBlockedBy) return;
    if (hasCard) {
      setConfirmOpen(true);
    } else {
      doPublish();
    }
  }

  return (
    <div onDragOver={(e) => e.preventDefault()}>
      {/* Sticky toolbar: type, autosave state, explicit save. Publish lives
          in the Lock & Publish rail so its requirements stay beside it. */}
      <div className="sticky top-0 z-30 -mx-5 mb-6 border-b border-border bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-5 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="t-eyebrow text-accent">Compose</span>
          <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-surface p-0.5">
            {types.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={cn(
                  "rounded-[4px] px-3 py-1 text-xs font-medium transition-colors",
                  type === t.key ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:text-text",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="t-meta min-w-16 text-[11px]" aria-live="polite">
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}
          </span>
          <div className="ml-auto">
            <Button
              variant="secondary"
              size="sm"
              disabled={savingDraft}
              onClick={() => startDraft(() => persistDraft())}
            >
              <FloppyDisk size={16} />
              Save draft
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[212px_minmax(0,1fr)_330px]">
        {/* Left rail: templates + block palette. Sticky so it walks with the
            author instead of getting left behind on long drafts. */}
        <aside className="scroll-area hidden self-start lg:sticky lg:top-16 lg:block lg:max-h-[calc(100dvh-5.5rem)] lg:space-y-6 lg:overflow-y-auto lg:pb-4 lg:pr-1">
          <TemplatesPanel onApply={applyTemplate} />
          <BlockPalette onAdd={addBlock} />
        </aside>

        {/* Canvas: flows with the page; the whole column is a drop target. */}
        <div className="flex min-w-0 flex-col gap-4 pb-24" onDrop={onCanvasDrop}>
          {type !== "short_post" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title"
              className="w-full bg-transparent text-3xl font-semibold tracking-tight placeholder:text-text-faint focus:outline-none"
            />
          )}
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={type === "short_post" ? 5 : 2}
            placeholder={
              type === "short_post" ? "What's on your mind?" : "One-line summary shown in feeds"
            }
            className="w-full resize-none rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2.5 text-base leading-relaxed focus-ring placeholder:text-text-faint"
          />

          {/* Mobile-only quick add; the palette rail is hidden below lg. */}
          {type !== "short_post" && (
            <div className="flex flex-wrap gap-1.5 lg:hidden">
              {(Object.keys(BLOCK_META) as BlockType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addBlock(t)}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-btn)] border border-border px-2.5 py-1.5 text-xs text-text-mute transition-colors hover:text-text focus-ring"
                >
                  <Plus size={12} />
                  {BLOCK_META[t].label}
                </button>
              ))}
            </div>
          )}

          {type !== "short_post" && (
            <>
              <BlockCanvas blocks={doc.blocks} onChange={(blocks) => setDoc({ ...doc, blocks })} />
              {doc.blocks.length === 0 && (
                <div className="flex min-h-44 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-dashed border-border-strong p-8 text-center">
                  <p className="text-sm font-medium text-text-mute">Build your analysis</p>
                  <p className="t-meta max-w-xs text-[12px]">
                    Drag blocks from the left, start from a template, or ask the copilot for a
                    structure.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right rail: the persistent Lock & Publish panel. */}
        <aside className="scroll-area self-start pb-8 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:pb-4 lg:pl-1">
          <LockPublishPanel
            hasCard={hasCard}
            ticker={ticker}
            onTicker={setTicker}
            direction={direction}
            onDirection={setDirection}
            target={target}
            onTarget={setTarget}
            horizon={horizon}
            onHorizon={setHorizon}
            access={access}
            onAccess={setAccess}
            price={price}
            onPrice={setPrice}
            plainText={plainText}
            credits={credits}
            onCreditsChange={setCredits}
            factCheck={factCheck}
            onFactCheck={setFactCheck}
            disclosure={disclosure}
            onDisclosure={setDisclosure}
            publishLabel={hasCard ? "Publish & Lock" : "Publish"}
            publishDisabledReason={publishBlockedBy}
            onPublish={onPublishClick}
            pending={pending}
            error={error}
          />
        </aside>
      </div>

      <LockConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        ticker={ticker.trim().toUpperCase()}
        targetPrice={target ? Number(target) : null}
        horizonDate={new Date(Date.now() + horizon * 86_400_000)}
        onConfirm={doPublish}
      />

      <AiDock
        context={{ title, ticker, type }}
        credits={credits}
        onCreditsChange={setCredits}
        onInsertBlock={addBlock}
      />
    </div>
  );
}
