"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { ArrowLeft, FloppyDisk, SidebarSimple, RocketLaunch, Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import { Button, buttonClass } from "@/components/ui/button";
import { publishReport, saveDraft } from "@/app/actions/reports";
import { documentPlainText, parseDocument } from "@/lib/editor/document";
import {
  emptyTiptapDoc,
  isTiptapDoc,
  parseTiptapDoc,
  tiptapPlainText,
} from "@/lib/editor/tiptap/serialize";
import type { AccessType, ContentType, Direction, Report } from "@/lib/types";
import type { Plan } from "@/lib/db/plans";
import { TiptapEditor } from "@/components/editor/tiptap/tiptap-editor";
import { captureChartScreenshots } from "@/lib/editor/tiptap/nodes/chart-capture";
import {
  LockPublishPanel,
  disclosuresAnswered,
  type DisclosureState,
} from "@/components/editor/lock-publish-panel";
import { AskPanel } from "@/components/editor/tiptap/ask-panel";
import { LockConfirmModal } from "@/components/ui/lock-confirm-modal";
import type { FactCheckResult } from "@/lib/ai/fact-check";
import { VisualizeSelectionMenu } from "@/components/editor/tiptap/visualize-selection-menu";
import { setEditorReportTicker } from "@/lib/editor/tiptap/editor-context";

const types: { key: ContentType; label: string }[] = [
  { key: "research", label: "Research" },
  { key: "call", label: "Call" },
  { key: "short_post", label: "Post" },
];

/**
 * Bring an existing draft into the Tiptap editor. New drafts are already
 * Tiptap JSON; legacy block-JSON and plain-text drafts are migrated to
 * paragraphs so the author never loses their words on the format switch.
 */
function initialTiptap(body: string | null | undefined): JSONContent {
  if (isTiptapDoc(body)) return parseTiptapDoc(body);
  let text = "";
  if (body && body.trimStart().startsWith("{")) {
    try {
      text = documentPlainText(parseDocument(body));
    } catch {
      text = "";
    }
  } else {
    text = body ?? "";
  }
  if (!text.trim()) return emptyTiptapDoc();
  const paras = text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] }));
  return { type: "doc", content: paras.length ? paras : [{ type: "paragraph" }] };
}

export function StudioEditor({
  analystReportPrice,
  initialDraft,
  aiCredits = 0,
  plans = [],
}: {
  analystReportPrice: number | null;
  initialDraft?: Report | null;
  aiCredits?: number;
  plans?: Plan[];
}) {
  const initialDoc = useMemo(() => initialTiptap(initialDraft?.body), [initialDraft?.body]);

  const [type, setType] = useState<ContentType>(initialDraft?.type ?? "research");
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [summary, setSummary] = useState(initialDraft?.summary ?? "");
  const [docJson, setDocJson] = useState<JSONContent>(initialDoc);
  const [plainText, setPlainText] = useState(() => tiptapPlainText(initialDoc));
  const [ticker, setTicker] = useState(initialDraft?.ticker ?? "");
  const [direction, setDirection] = useState<Direction>("long");
  const [target, setTarget] = useState("");
  const [horizon, setHorizon] = useState(30);
  const [access, setAccess] = useState<AccessType>(initialDraft?.access ?? "free");
  const [minPlanRank, setMinPlanRank] = useState(initialDraft?.min_plan_rank ?? 0);
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
  const [panelOpen, setPanelOpen] = useState(true);
  const [askOpen, setAskOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [savingDraft, startDraft] = useTransition();
  const editorRef = useRef<Editor | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const latestChangeRef = useRef<{ json: JSONContent; text: string }>({
    json: initialDoc,
    text: tiptapPlainText(initialDoc),
  });
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasCard = type !== "short_post";
  const bodyJson = useMemo(() => JSON.stringify(docJson), [docJson]);

  const onEditorChange = useCallback((change: { json: JSONContent; text: string }) => {
    latestChangeRef.current = change;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    // Debounce parent state so keystrokes don't re-render the editor tree and
    // kill the slash-menu popup mid-open.
    syncTimerRef.current = setTimeout(() => {
      setDocJson(change.json);
      setPlainText(change.text);
    }, 500);
  }, []);

  useEffect(
    () => () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setEditorReportTicker(hasCard ? ticker : undefined);
  }, [hasCard, ticker]);

  const insertNode = useCallback((node: JSONContent) => {
    editorRef.current?.chain().focus().insertContent(node).run();
  }, []);

  const persistDraft = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await saveDraft({
        id: draftId,
        type,
        title: type === "short_post" ? undefined : title,
        summary: summary || plainText.slice(0, 280),
        body: type === "short_post" ? undefined : JSON.stringify(latestChangeRef.current.json),
        access,
        price: access === "paid" ? Number(price) : null,
        min_plan_rank: access === "subscribers" ? minPlanRank : 0,
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
    plainText,
    bodyJson,
    access,
    minPlanRank,
    price,
    ticker,
    direction,
    target,
    horizon,
    hasCard,
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      if (summary.trim() || plainText.trim()) void persistDraft();
    }, 30_000);
    return () => clearInterval(t);
  }, [persistDraft, summary, plainText]);

  // First unmet publish requirement, or null when ready. Mirrors the
  // server-side enforcement in publishReport.
  const publishBlockedBy: string | null = (() => {
    if (type === "short_post") {
      return summary.trim() ? null : "Write your post first.";
    }
    if (!ticker.trim()) return "Add a ticker in the price target module.";
    if (plainText.trim() && !factCheck) return "Run the fact-check on your draft.";
    if (!disclosuresAnswered(disclosure)) return "Answer all three disclosures.";
    return null;
  })();

  const doPublish = useCallback(async () => {
    setError(null);
    const editor = editorRef.current;
    try {
      let id = draftId;
      // Screenshot every chart between "Lock it in" and the publish call, so
      // the reading view has a static image and the report gets an og:image.
      // Save first (charts upload under the report id); failures never block.
      if (hasCard && editor) {
        if (!id) {
          const res = await saveDraft({
            id: undefined,
            type,
            title,
            summary: summary || plainText.slice(0, 280),
            body: JSON.stringify(editor.getJSON()),
            access,
            price: access === "paid" ? Number(price) : null,
            min_plan_rank: access === "subscribers" ? minPlanRank : 0,
            ticker,
            direction,
            target_price: target ? Number(target) : null,
            horizon_days: horizon,
          });
          id = res.id;
          setDraftId(id);
        }
        setCaptureStatus("Capturing charts...");
        await captureChartScreenshots(editor, id);
        setCaptureStatus("Publishing...");
      }

      const finalBody =
        type === "short_post" ? undefined : editor ? JSON.stringify(editor.getJSON()) : bodyJson;

      await publishReport({
        id,
        type,
        title: type === "short_post" ? undefined : title,
        summary: summary || plainText.slice(0, 280),
        body: finalBody,
        access,
        price: access === "paid" ? Number(price) : null,
        min_plan_rank: access === "subscribers" ? minPlanRank : 0,
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
        setCaptureStatus(null);
        throw e;
      }
    }
  }, [
    draftId,
    type,
    title,
    summary,
    plainText,
    bodyJson,
    access,
    minPlanRank,
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
    // The publish requirements live in the panel; if anything is missing,
    // open the panel so the author sees exactly what is left.
    if (publishBlockedBy) {
      setPanelOpen(true);
      return;
    }
    if (hasCard) {
      setConfirmOpen(true);
    } else {
      start(async () => {
        await doPublish().catch(() => {});
      });
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-1px)] flex-col">
      {/* Top bar: back, type, save status, Save draft, Publish. Nothing else. */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-4 py-2.5 backdrop-blur-sm md:px-6">
        <Link
          href="/studio"
          className="flex items-center gap-1.5 text-sm text-text-mute transition-colors hover:text-text focus-ring rounded-[var(--radius-btn)]"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Studio</span>
        </Link>

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

        <span className="t-meta min-w-14 text-[11px]" aria-live="polite">
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Draft"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {hasCard && (
            <>
              {editor && (
                <VisualizeSelectionMenu
                  editor={editor}
                  reportTicker={ticker || undefined}
                  variant="button"
                />
              )}
              <button
                type="button"
                aria-label="Ask AI"
                aria-pressed={askOpen}
                onClick={() => setAskOpen((o) => !o)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] border px-2.5 text-xs font-medium transition-colors focus-ring",
                  askOpen ? "border-accent/40 bg-accent-weak text-accent" : "border-border text-text-mute hover:text-text",
                )}
              >
                <Sparkle size={15} weight="fill" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={savingDraft}
            onClick={() => startDraft(() => persistDraft())}
          >
            <FloppyDisk size={16} />
            <span className="hidden sm:inline">Save draft</span>
          </Button>
          <Button size="sm" disabled={pending} onClick={onPublishClick}>
            <RocketLaunch size={15} weight="fill" />
            {pending ? "Publishing..." : hasCard ? "Publish & Lock" : "Publish"}
          </Button>
          <button
            type="button"
            aria-label={panelOpen ? "Hide publish panel" : "Show publish panel"}
            aria-pressed={panelOpen}
            onClick={() => setPanelOpen((o) => !o)}
            className={cn(
              "hidden h-8 w-8 items-center justify-center rounded-[var(--radius-btn)] border transition-colors focus-ring lg:flex",
              panelOpen ? "border-accent/40 bg-accent-weak text-accent" : "border-border text-text-mute hover:text-text",
            )}
          >
            <SidebarSimple size={16} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mx-auto grid w-full flex-1 gap-8 px-4 py-8 md:px-6",
          panelOpen ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_340px]" : "max-w-3xl grid-cols-1",
        )}
      >
        {/* Editor column */}
        <div className="min-w-0">
          {type !== "short_post" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title"
              className="mb-2 w-full bg-transparent text-4xl font-semibold tracking-tight text-text placeholder:text-text-faint focus:outline-none"
              style={{ fontFamily: "var(--font-display)" }}
            />
          )}
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={type === "short_post" ? "What's on your mind?" : "One-line summary shown in feeds"}
            className="mb-6 w-full bg-transparent text-lg text-text-mute placeholder:text-text-faint focus:outline-none"
          />

          {type !== "short_post" && (
            <TiptapEditor
              initialContent={initialDoc}
              onChange={onEditorChange}
              reportTicker={hasCard ? ticker || undefined : undefined}
              onReady={(e) => {
                editorRef.current = e;
                setEditor(e);
              }}
            />
          )}
        </div>

        {/* Lock & Publish panel (collapsible) */}
        {panelOpen && (
          <aside className="scroll-area self-start lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:pl-1">
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
              minPlanRank={minPlanRank}
              onMinPlanRank={setMinPlanRank}
              plans={plans}
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
        )}
      </div>

      {/* Collapsed-panel affordance: reopen to set the call and publish. */}
      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className={buttonClass("secondary", "sm", "fixed bottom-5 right-5 z-40 shadow-[var(--shadow-card)]")}
        >
          <SidebarSimple size={15} />
          Lock &amp; Publish
        </button>
      )}

      <AskPanel
        open={askOpen}
        onClose={() => setAskOpen(false)}
        context={{ ticker, title }}
        credits={credits}
        onCreditsChange={setCredits}
        onInsertNode={insertNode}
      />

      <LockConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        ticker={ticker.trim().toUpperCase()}
        targetPrice={target ? Number(target) : null}
        horizonDate={new Date(Date.now() + horizon * 86_400_000)}
        busyLabel={captureStatus}
        onConfirm={doPublish}
      />
    </div>
  );
}
