"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { ArrowLeft, FloppyDisk, SidebarSimple, RocketLaunch, Sparkle, SquaresFour } from "@phosphor-icons/react";
import { toast } from "sonner";
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
import {
  ReportTemplatePicker,
  ReportTemplateStrip,
} from "@/components/editor/tiptap/report-template-picker";
import {
  applyReportTemplateToEditor,
  fetchTemplatePeers,
  isDocMostlyEmpty,
} from "@/lib/editor/tiptap/apply-report-template";
import { getTiptapTemplate } from "@/lib/editor/tiptap/templates";

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
  const [requiredPerks, setRequiredPerks] = useState<string[]>(initialDraft?.required_perks ?? []);
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
  const [templateOpen, setTemplateOpen] = useState(false);
  const [showTemplateStrip, setShowTemplateStrip] = useState(() =>
    isDocMostlyEmpty(null, initialDoc),
  );
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
  const dirtyRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards the 30s autosave from firing while doPublish is in flight -- without
  // this, a tick landing mid-publish can write status:"draft" and a stale body
  // over a row publishReport just (or is concurrently) flipping to "published".
  const isPublishingRef = useRef(false);

  const hasCard = type !== "short_post";
  const bodyJson = useMemo(() => JSON.stringify(docJson), [docJson]);

  const onEditorChange = useCallback((change: { json: JSONContent; text: string }) => {
    latestChangeRef.current = change;
    dirtyRef.current = true;
    if (change.text.trim().length > 40) setShowTemplateStrip(false);
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

  const applyTemplate = useCallback(
    async (templateId: string) => {
      const e = editorRef.current;
      if (!e) return;
      const tpl = getTiptapTemplate(templateId);
      if (!tpl) return;

      const hasContent = !isDocMostlyEmpty(e);
      if (hasContent) {
        const ok = window.confirm(
          `Apply “${tpl.name}”? Your current draft will be kept and the template sections will be appended below.`,
        );
        if (!ok) return;
      }

      const peers = await fetchTemplatePeers(ticker);
      const applied = applyReportTemplateToEditor(e, templateId, {
        ticker,
        peers,
        mode: hasContent ? "append" : "replace",
      });
      if (applied) {
        setShowTemplateStrip(false);
        dirtyRef.current = true;
        const json = e.getJSON();
        latestChangeRef.current = { json, text: tiptapPlainText(json) };
        setDocJson(json);
        setPlainText(latestChangeRef.current.text);
        toast.success(`${tpl.name} applied`);
      }
    },
    [ticker],
  );

  const getComposeContext = useCallback(() => {
    const e = editorRef.current;
    const excerpt = latestChangeRef.current.text.slice(0, 6_000);
    const selection =
      e && e.state.selection.from !== e.state.selection.to
        ? e.state.doc.textBetween(e.state.selection.from, e.state.selection.to, "\n").trim()
        : undefined;
    return {
      reportTicker: hasCard ? ticker : undefined,
      title,
      ticker: hasCard ? ticker : undefined,
      documentExcerpt: excerpt || undefined,
      selection: selection || undefined,
    };
  }, [hasCard, ticker, title]);

  const persistDraft = useCallback(async () => {
    if (isPublishingRef.current) return;
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
        required_perks: access === "subscribers" ? requiredPerks : [],
        ticker: hasCard ? ticker : null,
        direction: hasCard ? direction : undefined,
        target_price: hasCard && target ? Number(target) : null,
        horizon_days: hasCard ? horizon : undefined,
      });
      setDraftId(res.id);
      setSaveStatus("saved");
      setError(null);
      dirtyRef.current = false;
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      setSaveStatus("idle");
      const msg = e instanceof Error ? e.message : "Could not save draft. Try again.";
      setError(msg);
      toast.error(msg);
    }
  }, [
    draftId,
    type,
    title,
    summary,
    plainText,
    access,
    minPlanRank,
    requiredPerks,
    price,
    ticker,
    direction,
    target,
    horizon,
    hasCard,
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!dirtyRef.current) return;
      const json = JSON.stringify(latestChangeRef.current.json);
      const hasBlocks =
        json.includes('"chartNode"') ||
        json.includes('"napkinNode"') ||
        json.includes('"dataFigureNode"');
      if (draftId || summary.trim() || plainText.trim() || hasBlocks) void persistDraft();
    }, 30_000);
    return () => clearInterval(t);
  }, [persistDraft, summary, plainText, draftId]);

  // First unmet publish requirement, or null when ready. Mirrors the
  // server-side enforcement in publishReport.
  // Research may publish as overview without a ticker/locked call.
  // Calls still require a ticker so there is something to lock.
  const lockingCall = hasCard && Boolean(ticker.trim());
  const publishBlockedBy: string | null = (() => {
    if (type === "short_post") {
      return summary.trim() ? null : "Write your post first.";
    }
    if (type === "call" && !ticker.trim()) {
      return "Add a ticker to lock this call, or switch to Research for an overview.";
    }
    if (plainText.trim() && !factCheck) return "Run the fact-check on your draft.";
    if (!disclosuresAnswered(disclosure)) return "Answer all three disclosures.";
    return null;
  })();

  const doPublish = useCallback(async () => {
    setError(null);
    isPublishingRef.current = true;
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
        required_perks: access === "subscribers" ? requiredPerks : [],
            ticker: lockingCall ? ticker : null,
            direction: lockingCall ? direction : undefined,
            target_price: lockingCall && target ? Number(target) : null,
            horizon_days: lockingCall ? horizon : undefined,
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
        required_perks: access === "subscribers" ? requiredPerks : [],
        ticker: lockingCall ? ticker : null,
        direction: lockingCall ? direction : undefined,
        target_price: lockingCall && target ? Number(target) : null,
        horizon_days: lockingCall ? horizon : undefined,
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
        toast.error(e.message);
        setConfirmOpen(false);
        setCaptureStatus(null);
        isPublishingRef.current = false;
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
    requiredPerks,
    price,
    hasCard,
    lockingCall,
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
      toast.message(publishBlockedBy);
      return;
    }
    if (lockingCall) {
      setConfirmOpen(true);
    } else {
      start(async () => {
        try {
          await doPublish();
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Publish failed. Try again.";
          setError(msg);
          toast.error(msg);
        }
      });
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-1px)] flex-col">
      {/* Top bar: back, type, save status, Save draft, Publish. Nothing else. */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-paper px-4 py-2.5 md:px-6">
        <Link
          href="/studio"
          className="flex items-center gap-1.5 text-sm text-text-mute transition-colors hover:text-text focus-ring rounded-[var(--radius-btn)]"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Studio</span>
        </Link>

        <div
          role="radiogroup"
          aria-label="Report type"
          className="inline-flex rounded-[var(--radius-btn)] border border-border bg-surface p-0.5"
        >
          {types.map((t) => (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={type === t.key}
              onClick={() => setType(t.key)}
              className={cn(
                "rounded-[4px] px-3 py-1 text-xs font-medium transition-colors focus-ring",
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
        {error && (
          <span className="t-meta max-w-[14rem] truncate text-[11px] text-[var(--down)]" role="alert">
            {error}
          </span>
        )}

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
                aria-label="Report templates"
                onClick={() => setTemplateOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-2.5 text-xs font-medium text-text-mute transition-colors hover:text-text focus-ring"
              >
                <SquaresFour size={15} />
                <span className="hidden sm:inline">Templates</span>
              </button>
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
            {pending ? "Publishing..." : lockingCall ? "Publish & Lock" : "Publish"}
          </Button>
          <button
            type="button"
            aria-label={panelOpen ? "Hide publish panel" : "Show publish panel"}
            aria-pressed={panelOpen}
            onClick={() => setPanelOpen((o) => !o)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[var(--radius-btn)] border transition-colors focus-ring",
              panelOpen ? "border-border-strong bg-surface-2 text-text" : "border-border text-text-mute hover:text-text",
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
            <>
              <label htmlFor="report-title" className="sr-only">
                Report title
              </label>
              <input
                id="report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Report title"
                className="mb-2 w-full bg-transparent text-4xl font-semibold tracking-tight text-text placeholder:text-text-mute focus:outline-none"
                style={{ fontFamily: "var(--font-display)" }}
              />
            </>
          )}
          <label htmlFor="report-summary" className="sr-only">
            {type === "short_post" ? "Post text" : "Summary"}
          </label>
          <input
            id="report-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={type === "short_post" ? "What's on your mind?" : "One-line summary shown in feeds"}
            className="mb-6 w-full bg-transparent text-lg text-text-mute placeholder:text-text-faint focus:outline-none"
          />

          {type !== "short_post" && showTemplateStrip && (
            <ReportTemplateStrip ticker={ticker || undefined} onApply={applyTemplate} />
          )}

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
          <aside className="scroll-area self-start lg:sticky lg:top-14 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:pl-1">
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
              requiredPerks={requiredPerks}
              onRequiredPerks={setRequiredPerks}
              plans={plans}
              plainText={plainText}
              credits={credits}
              onCreditsChange={setCredits}
              factCheck={factCheck}
              onFactCheck={setFactCheck}
              disclosure={disclosure}
              onDisclosure={setDisclosure}
              publishLabel={lockingCall ? "Publish & Lock" : "Publish"}
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
        editor={editor}
        getEditorContext={getComposeContext}
        onApplyTemplate={applyTemplate}
      />

      <ReportTemplatePicker
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        ticker={ticker || undefined}
        onApply={applyTemplate}
        anchor="compose"
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
