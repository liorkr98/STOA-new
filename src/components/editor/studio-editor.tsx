"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { ArrowLeft, FloppyDisk, RocketLaunch, SquaresFour } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import { publishReport, saveDraft } from "@/app/actions/reports";
import { uploadComposeClip } from "@/lib/video/upload-clip";
import { documentPlainText, parseDocument } from "@/lib/editor/document";
import {
  emptyTiptapDoc,
  isTiptapDoc,
  parseTiptapDoc,
  tiptapPlainText,
} from "@/lib/editor/tiptap/serialize";
import type { AccessType, Direction, Report } from "@/lib/types";
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
import { VideoRung } from "@/components/compose/video-rung";
import { TagPicker, EMPTY_TAGS, type TagSelection } from "@/components/compose/tag-picker";
import { UNIVERSE } from "@/lib/universe";
import { CardTray } from "@/components/compose/card-tray";
import { CardLibrary } from "@/components/compose/card-library";
import { CardEditorDialog } from "@/components/compose/card-editor";
import { AiAssistant, type AssistantAction } from "@/components/compose/ai-assistant";
import {
  ComposeRail,
  ComposeRailDrawer,
  RailOpenButton,
} from "@/components/compose/compose-rail";
import { PromotePanel } from "@/components/compose/promote-panel";
import {
  blankCard,
  cardName,
  moveCard,
  orderedDeck,
  toStoredCards,
  type CardUsage,
  type DraftCard,
} from "@/lib/compose/cards";
import { setComposeDeck } from "@/lib/compose/card-store";
import { emptyEdit, type VideoEdit } from "@/lib/compose/overlays";
import { saveCards } from "@/app/actions/cards";
import { isCardDrag, readCardDrag } from "@/lib/compose/drag";
import type { CardKind } from "@/lib/feed/card-schema";
import type { PromoteState } from "@/lib/compose/promote";
import { EMPTY_PROMOTE } from "@/lib/compose/promote";
import { CompanionPicker } from "@/components/compose/companion-picker";
import { PublishDetailsDialog } from "@/components/compose/publish-details";
import { PublishPreviewDialog } from "@/components/compose/publish-preview";
import { CardPreview } from "@/components/compose/card-preview";
import { FactCheckerPanel } from "@/components/editor/fact-checker-panel";
import {
  COMPOSE_MODES,
  POST_MAX_CHARS,
  clipPlayableSeconds,
  feedPreviewSecondsForClip,
  modeFromType,
  typeFromMode,
  type ComposeMode,
} from "@/lib/compose/modes";

const types = COMPOSE_MODES;

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

/** Every card placed in the research body, by id. */
function collectCardIds(doc: JSONContent | null | undefined): Set<string> {
  const out = new Set<string>();
  const walk = (n: JSONContent | undefined) => {
    if (!n) return;
    if (n.type === "cardNode") {
      const id = (n.attrs as { cardId?: string } | undefined)?.cardId;
      if (id) out.add(id);
    }
    (n.content ?? []).forEach(walk);
  };
  walk(doc ?? undefined);
  return out;
}

/** Fixed, because the CTA is derived rather than authored. */
const CTA_CARD_ID = "cta";

export function StudioEditor({
  analystReportPrice,
  initialDraft,
  initialCards = [],
  hasVideoClip = false,
  aiCredits = 0,
  plans = [],
}: {
  analystReportPrice: number | null;
  initialDraft?: Report | null;
  /** The draft's saved deck, payloads intact (see listAuthorCards). */
  initialCards?: DraftCard[];
  /** The draft already has a clip, so it opens with its video module. */
  hasVideoClip?: boolean;
  aiCredits?: number;
  plans?: Plan[];
}) {
  const initialDoc = useMemo(() => initialTiptap(initialDraft?.body), [initialDraft?.body]);

  const [mode, setMode] = useState<ComposeMode>(() => modeFromType(initialDraft?.type));
  const type = typeFromMode(mode);

  // The file a creator picked in the video rung, held until the report is
  // locked. video_clips rows hang off a locked report, so the upload cannot
  // start until publish has returned an id.
  const videoFileRef = useRef<{ file: File; durationSeconds: number } | null>(null);

  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [summary, setSummary] = useState(initialDraft?.summary ?? "");
  const [docJson, setDocJson] = useState<JSONContent>(initialDoc);
  const [plainText, setPlainText] = useState(() => tiptapPlainText(initialDoc));
  const [ticker, setTicker] = useState(initialDraft?.ticker ?? "");
  // Persisted on save/publish to reports.primary_tag / secondary_tags. Seeded
  // from the draft: without this, reopening a tagged draft showed no tags and
  // the next save wrote the empty selection back over them.
  const [tags, setTags] = useState<TagSelection>(() =>
    initialDraft?.primary_tag || initialDraft?.secondary_tags?.length
      ? {
          primary: initialDraft.primary_tag ?? null,
          secondary: initialDraft.secondary_tags ?? [],
          primaryPinned: Boolean(initialDraft.primary_tag),
        }
      : EMPTY_TAGS,
  );

  // The publication's modules. No fork: a publication may have video,
  // research, both or neither, and adding one is not a question asked before
  // the creator has written anything.
  const [videoEdit, setVideoEdit] = useState<VideoEdit | null>(() =>
    hasVideoClip || modeFromType(initialDraft?.type) === "video" ? emptyEdit(90) : null,
  );

  function chooseMode(next: ComposeMode) {
    // Post stores neither a headline nor a body, so switching to it from a
    // format that has them throws that writing away on the next save. It used
    // to happen silently: ask first.
    if (next === "short_post" && mode !== "short_post") {
      const losing = [title.trim() && "headline", plainText.trim() && "body"].filter(Boolean);
      if (
        losing.length > 0 &&
        !window.confirm(
          `A Post has no ${losing.join(" or ")}. Switching will drop the ${losing.join(" and ")} you have written. Continue?`,
        )
      ) {
        return;
      }
    }
    setMode(next);
    if (next === "video") setVideoEdit((e) => e ?? emptyEdit(90));
  }

  // The deck. One pool for the whole publication, not a step inside the video.
  // What the creator authored. The CTA is not in here: it is derived from
  // Access below, so it can never be deleted, duplicated or left behind on a
  // publication that stopped being gated.
  const [cards, setCards] = useState<DraftCard[]>(() =>
    initialCards.filter((c) => c.kind !== "unlock"),
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [researchCardIds, setResearchCardIds] = useState<Set<string>>(() => collectCardIds(initialDoc));
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [railDrawerOpen, setRailDrawerOpen] = useState(false);
  const [askSeed, setAskSeed] = useState<string | null>(null);
  const [promote, setPromote] = useState<PromoteState>(EMPTY_PROMOTE);
  const [researchDropActive, setResearchDropActive] = useState(false);
  const [direction, setDirection] = useState<Direction>("long");
  const [target, setTarget] = useState("");
  const [horizon, setHorizon] = useState(30);
  const [access, setAccess] = useState<AccessType>(initialDraft?.access ?? "free");
  const [membersIncluded, setMembersIncluded] = useState(Boolean(initialDraft?.members_included));
  const [linkedReportId, setLinkedReportId] = useState<string | null>(initialDraft?.linked_report_id ?? null);
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [showTemplateStrip, setShowTemplateStrip] = useState(() =>
    isDocMostlyEmpty(null, initialDoc),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Stamped when the confirm modal opens, not read during render: the analyst
  // is confirming the horizon they saw, and render has to stay pure.
  const [confirmHorizonDate, setConfirmHorizonDate] = useState(
    () => new Date(Date.now() + 30 * 86_400_000),
  );
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

  const hasCard = true;
  const bodyJson = useMemo(() => JSON.stringify(docJson), [docJson]);

  const onEditorChange = useCallback((change: { json: JSONContent; text: string }) => {
    latestChangeRef.current = change;
    dirtyRef.current = true;
    setResearchCardIds(collectCardIds(change.json));
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

  /* --------------------------------------------------------------- cards */

  // The deck as it is shown and stored: the creator's cards, and the CTA last
  // whenever there is something to unlock.
  const deck = useMemo(
    () =>
      access === "free"
        ? cards
        : orderedDeck([...cards, { id: CTA_CARD_ID, kind: "unlock" as const, locked: false, payload: {} }]),
    [cards, access],
  );

  // The cardNode views are mounted by ProseMirror, not by this tree, so the
  // deck reaches them through the store rather than through props.
  useEffect(() => {
    setComposeDeck(deck);
  }, [deck]);

  const usage = useMemo(() => {
    const map = new Map<string, CardUsage>();
    const inVideo = new Set<string>();
    for (const o of videoEdit?.overlays ?? []) {
      if (o.kind === "visual" && o.source.type === "card" && o.source.cardId) inVideo.add(o.source.cardId);
    }
    for (const c of cards) {
      map.set(c.id, { inVideo: inVideo.has(c.id), inResearch: researchCardIds.has(c.id) });
    }
    return map;
  }, [cards, videoEdit, researchCardIds]);

  const addCard = useCallback((kind: CardKind) => {
    const card = blankCard(kind);
    setCards((cs) => orderedDeck([...cs, card]));
    setSelectedCardId(card.id);
    dirtyRef.current = true;
  }, [setSelectedCardId]);

  const updateCard = useCallback((next: DraftCard) => {
    setCards((cs) => cs.map((c) => (c.id === next.id ? next : c)));
    dirtyRef.current = true;
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards((cs) => cs.filter((c) => c.id !== id));
    setSelectedCardId(null);
    dirtyRef.current = true;
    // The placements go with it: an overlay pointing at a deleted card would
    // render a hole, and a figure in the prose would render a placeholder.
    setVideoEdit((e) =>
      e
        ? {
            ...e,
            overlays: e.overlays.filter(
              (o) => !(o.kind === "visual" && o.source.type === "card" && o.source.cardId === id),
            ),
          }
        : e,
    );
    const editor = editorRef.current;
    if (editor) {
      const positions: number[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "cardNode" && node.attrs.cardId === id) positions.push(pos);
      });
      // Back to front, so an earlier deletion never shifts a later position.
      for (const pos of positions.reverse()) {
        editor.chain().deleteRange({ from: pos, to: pos + 1 }).run();
      }
    }
  }, []);

  const reorderCards = useCallback((cardId: string, toIndex: number) => {
    setCards((cs) => {
      const from = cs.findIndex((c) => c.id === cardId);
      if (from < 0) return cs;
      return moveCard(cs, from, toIndex);
    });
    dirtyRef.current = true;
  }, []);

  /** Place a card on the video's visual track, at the playhead. */
  const placeCardInVideo = useCallback(
    (cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      setVideoEdit((e) => {
        const edit = e ?? emptyEdit(90);
        const start = Math.max(0, Math.min(0, edit.durationSeconds - 4));
        return {
          ...edit,
          overlays: [
            ...edit.overlays,
            {
              id: `o_${Math.random().toString(36).slice(2, 9)}`,
              kind: "visual" as const,
              start,
              end: Math.min(edit.durationSeconds, start + 4),
              source: { type: "card" as const, cardId, label: cardName(card) },
              mode: "inset" as const,
              position: 3,
            },
          ],
        };
      });
      setRailDrawerOpen(false);
      dirtyRef.current = true;
      toast.success(`${cardName(card)} added to the video`);
    },
    [cards],
  );

  /** Place a card in the research body, as an inline figure. */
  const placeCardInResearch = useCallback(
    (cardId: string, at?: number) => {
      const card = cards.find((c) => c.id === cardId);
      const editor = editorRef.current;
      if (!card || !editor) return;
      const node = { type: "cardNode", attrs: { cardId } };
      if (typeof at === "number") editor.chain().focus().insertContentAt(at, node).run();
      else editor.chain().focus().insertContent(node).run();
      setResearchCardIds(collectCardIds(editor.getJSON()));
      setRailDrawerOpen(false);
      dirtyRef.current = true;
      toast.success(`${cardName(card)} added to the research`);
    },
    [cards, setRailDrawerOpen],
  );

  /** A card dropped anywhere in the research body lands where it was dropped. */
  const onResearchDrop = useCallback(
    (e: React.DragEvent) => {
      setResearchDropActive(false);
      const cardId = readCardDrag(e);
      if (!cardId) return;
      e.preventDefault();
      const editor = editorRef.current;
      const at = editor?.view.posAtCoords({ left: e.clientX, top: e.clientY })?.pos;
      placeCardInResearch(cardId, at);
    },
    [placeCardInResearch, setResearchDropActive],
  );

  const runAssistant = useCallback((action: AssistantAction) => {
    setAskSeed(action.prompt);
    setAskOpen(true);
    setRailDrawerOpen(false);
  }, [setAskSeed, setAskOpen, setRailDrawerOpen]);

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
      dek: summary,
      ticker: hasCard ? ticker : undefined,
      documentExcerpt: excerpt || undefined,
      selection: selection || undefined,
    };
  }, [hasCard, ticker, title, summary]);

  const clipSeconds =
    mode === "video" && videoEdit
      ? clipPlayableSeconds(videoEdit.trimStart, videoEdit.trimEnd, videoEdit.durationSeconds)
      : 0;
  const feedPreviewSeconds = mode === "video" ? feedPreviewSecondsForClip(clipSeconds) : null;

  const persistDraft = useCallback(async () => {
    if (isPublishingRef.current) return;
    setSaveStatus("saving");
    try {
      const res = await saveDraft({
        id: draftId,
        type,
        title: type === "short_post" ? undefined : title,
        summary: summary || (type === "short_post" ? "" : plainText.slice(0, 280)),
        body: type === "short_post" ? undefined : JSON.stringify(latestChangeRef.current.json),
        access,
        price: access === "paid" ? Number(price) : null,
        members_included: membersIncluded,
        linked_report_id: linkedReportId,
        feed_preview_seconds: mode === "video" ? feedPreviewSeconds : null,
        min_plan_rank: access === "subscribers" ? minPlanRank : 0,
        required_perks: access === "subscribers" ? requiredPerks : [],
        ticker: ticker.trim() ? ticker : null,
        direction: ticker.trim() ? direction : undefined,
        target_price: ticker.trim() && target ? Number(target) : null,
        horizon_days: ticker.trim() ? horizon : undefined,
        primary_tag: tags.primary,
        secondary_tags: tags.secondary,
      });
      setDraftId(res.id);
      // Cards need the report id, so they are written after the draft row
      // exists. A card failure must not read as a lost draft: the words are
      // already saved by this point.
      if (res.id) {
        const cardRes = await saveCards(res.id, toStoredCards(deck));
        if (!cardRes.ok) toast.error(cardRes.error ?? "Could not save the cards.");
      }
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
    membersIncluded,
    linkedReportId,
    mode,
    tags,
    deck,
    feedPreviewSeconds,
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
  const lockingCall = Boolean(ticker.trim());
  const showVideo = mode === "video";
  const showResearch = mode === "research";
  const hasVideo = showVideo && videoEdit !== null;
  const showToolboxRail = true;

  const contentBlockedBy: string | null = (() => {
    if (mode === "short_post") {
      const text = summary.trim();
      if (!text) return "Write your post first.";
      if (text.length > POST_MAX_CHARS) return `Posts are ${POST_MAX_CHARS} characters.`;
      return null;
    }
    if (mode === "video" && !hasVideo) return "Add a video.";
    if (mode !== "video" && !title.trim()) return "Add a headline.";
    if (mode === "video" && !title.trim() && !summary.trim()) return "Add a headline or a one-line dek.";
    return null;
  })();

  const detailsBlockedBy: string | null = (() => {
    if (mode === "video" && !tags.primary) return "Choose a primary tag.";
    if (showResearch && plainText.trim() && !factCheck) return "Run the fact-check in Assistant.";
    if (!disclosuresAnswered(disclosure)) return "Answer all three disclosures.";
    return null;
  })();

  const publishBlockedBy = contentBlockedBy ?? detailsBlockedBy;

  const doPublish = useCallback(async () => {
    setError(null);
    isPublishingRef.current = true;
    const editor = editorRef.current;
    const extras = {
      members_included: membersIncluded,
      linked_report_id: linkedReportId,
      feed_preview_seconds: feedPreviewSeconds,
    };
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
            ...extras,
            ticker: lockingCall ? ticker : null,
            direction: lockingCall ? direction : undefined,
            target_price: lockingCall && target ? Number(target) : null,
            horizon_days: lockingCall ? horizon : undefined,
            primary_tag: tags.primary,
            secondary_tags: tags.secondary,
          });
          id = res.id;
          setDraftId(id);
        }
        setCaptureStatus("Capturing charts...");
        await captureChartScreenshots(editor, id);
        setCaptureStatus("Publishing...");
      }

      if (id) {
        const cardRes = await saveCards(id, toStoredCards(deck));
        if (!cardRes.ok) throw new Error(cardRes.error ?? "Could not save the cards.");
      }

      const finalBody =
        type === "short_post" ? undefined : editor ? JSON.stringify(editor.getJSON()) : bodyJson;

      // A chosen clip can only attach to a locked report, so hold the redirect,
      // publish, upload, then navigate. Without this the clip was never sent
      // anywhere: the rung only ever held a local object URL.
      const pendingVideo = mode === "video" ? videoFileRef.current : null;

      const published = await publishReport({
        id,
        type,
        title: type === "short_post" ? undefined : title,
        summary: summary || plainText.slice(0, 280),
        body: finalBody,
        access,
        price: access === "paid" ? Number(price) : null,
        min_plan_rank: access === "subscribers" ? minPlanRank : 0,
        required_perks: access === "subscribers" ? requiredPerks : [],
        ...extras,
        ticker: lockingCall ? ticker : null,
        direction: lockingCall ? direction : undefined,
        target_price: lockingCall && target ? Number(target) : null,
        horizon_days: lockingCall ? horizon : undefined,
        primary_tag: tags.primary,
        secondary_tags: tags.secondary,
        fact_check_results: factCheck as unknown as Record<string, unknown> | null,
        ...(hasCard
          ? {
              position_held: disclosure.positionHeld ?? false,
              compensation_tied: disclosure.compTied ?? false,
              compensation_detail: disclosure.compDetail || undefined,
              views_certified: disclosure.viewsCertified,
            }
          : {}),
      }, !pendingVideo);

      if (pendingVideo && published?.id) {
        try {
          setCaptureStatus("Uploading video...");
          await uploadComposeClip({
            reportId: published.id,
            file: pendingVideo.file,
            title: title || summary,
            durationSeconds: pendingVideo.durationSeconds,
            onProgress: (pct) => setCaptureStatus(`Uploading video... ${Math.round(pct)}%`),
          });
          videoFileRef.current = null;
          toast.success("Published. The video is processing and appears when it is ready.");
          window.location.href = `/report/${published.id}`;
        } catch (err) {
          // The report is already locked, so this must not read as a failed
          // publish: the clip can be attached again from the publication. Hold
          // the redirect so the reason stays on screen instead of being wiped
          // by an immediate navigation.
          const reason =
            err instanceof Error ? err.message : "Published, but the video upload failed.";
          setCaptureStatus(null);
          setError(`Published, but the video did not upload: ${reason}`);
          toast.error(reason);
          isPublishingRef.current = false;
        }
      }
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
    tags,
    deck,
    membersIncluded,
    linkedReportId,
    feedPreviewSeconds,
    setConfirmOpen,
    setError,
    setDraftId,
    setCaptureStatus,
  ]);

  function onDetailsClick() {
    if (contentBlockedBy) {
      toast.message(contentBlockedBy);
      return;
    }
    setPanelOpen(true);
  }

  function onPublishClick() {
    if (contentBlockedBy) {
      toast.message(contentBlockedBy);
      return;
    }
    if (detailsBlockedBy) {
      setPanelOpen(true);
      toast.message(detailsBlockedBy);
      return;
    }
    if (lockingCall) {
      setConfirmHorizonDate(new Date(Date.now() + horizon * 86_400_000));
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

  /* LEFT: Assistant, plus the card deck on Research. */
  const toolbox = (
    <>
      {showResearch ? (
        <CardTray
          cards={deck}
          usage={usage}
          selectedId={selectedCardId}
          onSelect={setSelectedCardId}
          onAdd={() => setLibraryOpen(true)}
          onReorder={reorderCards}
          onPlaceInVideo={placeCardInVideo}
          onPlaceInResearch={placeCardInResearch}
          hasVideo={false}
          hasResearch
        />
      ) : null}
      <AiAssistant
        onRun={runAssistant}
        credits={credits}
        askOpen={askOpen}
        onAsk={() => {
          setAskOpen(true);
          setRailDrawerOpen(false);
        }}
      >
        {showResearch ? (
          <FactCheckerPanel
            text={plainText}
            credits={credits}
            initialResult={factCheck}
            onCreditsChange={setCredits}
            onResult={setFactCheck}
          />
        ) : null}
        {showResearch && editor ? (
          <VisualizeSelectionMenu
            editor={editor}
            reportTicker={ticker || undefined}
            variant="button"
          />
        ) : null}
        {showResearch ? (
          <button
            type="button"
            aria-label="Report templates"
            onClick={() => setTemplateOpen(true)}
            className="flex h-8 w-full items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-2.5 text-xs font-medium text-text-mute transition-colors hover:text-text focus-ring"
          >
            <SquaresFour size={15} />
            Templates
          </button>
        ) : null}
      </AiAssistant>
    </>
  );

  /* RIGHT: what you publish as. */
  const settings = (
    <>
      <button
        type="button"
        onClick={() => {
          setPanelOpen(false);
          setPreviewOpen(true);
        }}
        className="mb-4 w-full rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2 text-left text-[0.8125rem] text-text hover:border-[var(--ink)] focus-ring"
      >
        Preview publication
      </button>
      <TagPicker
        value={tags}
        onChange={setTags}
        hasCall={lockingCall}
        callSector={lockingCall ? UNIVERSE.find((u) => u.ticker === ticker.trim().toUpperCase())?.sector ?? null : null}
      />
      <CompanionPicker
        currentId={draftId}
        mode={mode}
        value={linkedReportId}
        onChange={setLinkedReportId}
      />
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
        membersIncluded={membersIncluded}
        onMembersIncluded={setMembersIncluded}
        minPlanRank={minPlanRank}
        onMinPlanRank={setMinPlanRank}
        requiredPerks={requiredPerks}
        onRequiredPerks={setRequiredPerks}
        plans={plans}
        disclosure={disclosure}
        onDisclosure={setDisclosure}
        publishLabel={lockingCall ? "Publish & Lock" : "Publish"}
        publishDisabledReason={publishBlockedBy}
        onPublish={onPublishClick}
        pending={pending}
        error={error}
        promote={<PromotePanel state={promote} onChange={setPromote} />}
      />
    </>
  );

  return (
    <div className="flex min-h-[calc(var(--app-h)-1px)] flex-col">
      {/* Top bar: back, type, save status, Save draft, Publish. Nothing else. */}
      <div className="sticky top-0 z-30 flex items-center gap-2 overflow-x-auto border-b border-border bg-paper px-3 py-2.5 [scrollbar-width:none] md:flex-wrap md:gap-3 md:px-6">
        <Link
          href="/studio"
          className="flex items-center gap-1.5 text-sm text-text-mute transition-colors hover:text-text focus-ring rounded-[var(--radius-btn)]"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Studio</span>
        </Link>

        {showToolboxRail ? (
        <RailOpenButton
          onClick={() => setRailDrawerOpen(true)}
          cardCount={cards.length}
        />
        ) : null}

        <div
          role="radiogroup"
          aria-label="Publication format"
          className="inline-flex shrink-0 rounded-[var(--radius-btn)] border border-border bg-surface p-0.5"
        >
          {types.map((t) => (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={mode === t.key}
              onClick={() => chooseMode(t.key)}
              className={cn(
                "rounded-[4px] px-3 py-1 text-xs font-medium transition-colors focus-ring",
                mode === t.key ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:text-text",
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

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={savingDraft}
            onClick={() => startDraft(() => persistDraft())}
          >
            <FloppyDisk size={16} />
            <span className="hidden sm:inline">Save draft</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPreviewOpen(true)}
          >
            Preview
          </Button>
          <Button size="sm" disabled={pending} onClick={onDetailsClick} className="shrink-0">
            <RocketLaunch size={15} weight="fill" />
            {pending ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      {/* LEFT is what you build with, RIGHT is what you publish as. */}
      <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
        {showToolboxRail ? (
        <ComposeRail
          collapsed={railCollapsed}
          onToggle={() => setRailCollapsed((c) => !c)}
          cardCount={cards.length}
        >
          {toolbox}
        </ComposeRail>
        ) : null}

        {/* Canvas */}
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[var(--w-reading)] px-4 py-8 md:px-6">
            {(type !== "short_post") && (
              <>
                <label htmlFor="report-title" className="sr-only">
                  Headline
                </label>
                <input
                  id="report-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Headline"
                  dir="auto"
                  className="user-copy mb-2 w-full bg-transparent text-4xl font-semibold tracking-tight text-text placeholder:text-text-mute focus:outline-none"
                  style={{ fontFamily: "var(--font-display)" }}
                />
              </>
            )}
            <label htmlFor="report-summary" className="sr-only">
              {type === "short_post" ? "Post text" : "Dek"}
            </label>
            {type === "short_post" ? (
              <>
                <textarea
                  id="report-summary"
                  value={summary}
                  maxLength={POST_MAX_CHARS}
                  onChange={(e) => setSummary(e.target.value.slice(0, POST_MAX_CHARS))}
                  placeholder="A short take."
                  rows={5}
                  dir="auto"
                  className="user-copy mb-2 w-full resize-none bg-transparent text-lg text-text placeholder:text-text-faint focus:outline-none"
                />
                <p className="num mb-8 text-[11px] uppercase tracking-[0.12em] text-text-faint">
                  {summary.trim().length} / {POST_MAX_CHARS}
                </p>
              </>
            ) : (
            <input
              id="report-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One line under the headline"
              dir="auto"
              className="user-copy mb-8 w-full bg-transparent text-lg text-text-mute placeholder:text-text-faint focus:outline-none"
            />
            )}

            {/* VIDEO format only. Research and Post are text. */}
            {showVideo ? (
              <section aria-label="Video" className="mb-10">
                {clipSeconds > 0 && feedPreviewSeconds ? (
                  <p className="mb-4 text-[0.8125rem] leading-snug text-text-mute">
                    This clip is longer than the Feed budget. The Feed will play the first {feedPreviewSeconds} seconds. The full video stays on Explore and your profile.
                  </p>
                ) : clipSeconds > 0 ? (
                  <p className="mb-4 text-[0.8125rem] leading-snug text-text-mute">
                    This clip fits the Feed. Readers will see the whole thing there.
                  </p>
                ) : null}
                <VideoRung
                  value={videoEdit ?? undefined}
                  onChange={setVideoEdit}
                  onFile={(file, durationSeconds) => {
                    videoFileRef.current = { file, durationSeconds };
                  }}
                  cards={deck}
                  chrome={false}
                  ticker={ticker.trim() || undefined}
                  toolbox={
                    <CardTray
                      cards={deck}
                      usage={usage}
                      selectedId={selectedCardId}
                      onSelect={setSelectedCardId}
                      onAdd={() => setLibraryOpen(true)}
                      onReorder={reorderCards}
                      onPlaceInVideo={placeCardInVideo}
                      onPlaceInResearch={placeCardInResearch}
                      hasVideo
                      hasResearch={false}
                    />
                  }
                />
              </section>
            ) : null}

            {showResearch ? (
              <section aria-label="Research" className="mb-10">
                {cards.filter((c) => c.kind !== "unlock").length > 0 ? (
                  <div className="mb-8">
                    <p className="t-eyebrow">Preview</p>
                    <p className="mt-1 text-[0.8125rem] leading-snug text-text-mute">
                      Cards are the short version of the thesis. The full text is below.
                    </p>
                    <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                      {cards
                        .filter((c) => c.kind !== "unlock")
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCardId(c.id)}
                            className="w-[220px] shrink-0 text-left focus-ring rounded-[var(--radius-card)]"
                          >
                            <CardPreview card={c} compact />
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="mb-6 text-[0.8125rem] leading-snug text-text-mute">
                    Cards in the Assistant rail are the preview of this thesis. Add one, then write the full argument here.
                  </p>
                )}
                {showTemplateStrip && (
                  <ReportTemplateStrip ticker={ticker || undefined} onApply={applyTemplate} />
                )}
                <div
                  onDragOver={(e) => {
                    if (!isCardDrag(e)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    setResearchDropActive(true);
                  }}
                  onDragLeave={() => setResearchDropActive(false)}
                  onDrop={onResearchDrop}
                  className={cn(
                    "rounded-[var(--radius-card)] transition-colors",
                    researchDropActive &&
                      "bg-[color-mix(in_srgb,var(--brass)_10%,transparent)] ring-2 ring-[var(--brass)]",
                  )}
                >
                  <TiptapEditor
                    initialContent={initialDoc}
                    onChange={onEditorChange}
                    reportTicker={hasCard ? ticker || undefined : undefined}
                    onReady={(e) => {
                      editorRef.current = e;
                      setEditor(e);
                    }}
                  />
                </div>
              </section>
            ) : null}

            {!showResearch ? (
              <div className="hidden">
                <TiptapEditor
                  initialContent={initialDoc}
                  onChange={onEditorChange}
                  reportTicker={hasCard ? ticker || undefined : undefined}
                  onReady={(e) => {
                    editorRef.current = e;
                    setEditor(e);
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showToolboxRail ? (
      <ComposeRailDrawer open={railDrawerOpen} onClose={() => setRailDrawerOpen(false)}>
        {toolbox}
      </ComposeRailDrawer>
      ) : null}

      <CardLibrary open={libraryOpen} onOpenChange={setLibraryOpen} onPick={addCard} />

      <CardEditorDialog
        card={cards.find((c) => c.id === selectedCardId) ?? null}
        onChange={updateCard}
        onDelete={() => selectedCardId && deleteCard(selectedCardId)}
        onClose={() => setSelectedCardId(null)}
      />

      <PublishDetailsDialog open={panelOpen} onOpenChange={setPanelOpen}>
        {settings}
      </PublishDetailsDialog>

      <PublishPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        dek={summary}
        cards={cards}
        clipSeconds={mode === "video" ? clipSeconds : null}
        feedPreviewSeconds={feedPreviewSeconds}
      />

      <AskPanel
        open={askOpen}
        seed={askSeed}
        onClose={() => {
          setAskOpen(false);
          setAskSeed(null);
        }}
        context={{ ticker, title, dek: summary }}
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
        horizonDate={confirmHorizonDate}
        busyLabel={captureStatus}
        onConfirm={doPublish}
      />
    </div>
  );
}
