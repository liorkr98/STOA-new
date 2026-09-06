"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import Link from "next/link";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { ArrowLeft, FloppyDisk, RocketLaunch, SquaresFour } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import { publishReport, saveDraft, updatePublishedReport } from "@/app/actions/reports";
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
import {
  AiAssistant,
  ASSISTANT_ACTIONS,
  type AssistantAction,
} from "@/components/compose/ai-assistant";
import {
  ComposeRail,
  ComposeRailDrawer,
  RailOpenButton,
} from "@/components/compose/compose-rail";
import { PromotePanel } from "@/components/compose/promote-panel";
import {
  blankCard,
  cardIsEmpty,
  cardName,
  moveCard,
  orderedDeck,
  toStoredCards,
  type CardUsage,
  type DraftCard,
} from "@/lib/compose/cards";
import { setComposeDeck } from "@/lib/compose/card-store";
import { emptyEdit, type VideoEdit } from "@/lib/compose/overlays";
import { useFrameHeight } from "@/components/layout/scroll-frame";
import { useSymbolLookup } from "@/lib/market/use-symbol-lookup";
import { saveCards } from "@/app/actions/cards";
import { isCardDrag, readCardDrag } from "@/lib/compose/drag";
import type { CardKind } from "@/lib/feed/card-schema";
import type { PromoteState } from "@/lib/compose/promote";
import { EMPTY_PROMOTE } from "@/lib/compose/promote";
import { CompanionPicker } from "@/components/compose/companion-picker";
import { PublishPreviewDialog } from "@/components/compose/publish-preview";
import { CardPreview } from "@/components/compose/card-preview";
import { FactCheckerPanel } from "@/components/editor/fact-checker-panel";
import {
  advanceFor,
  stepState,
  stepsFor,
  type StepFacts,
  type StepKey,
} from "@/lib/compose/steps";
import { StepFrame, StepNav } from "@/components/compose/step-nav";
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

/** Remembers that the creator took the template helper down. */
const TEMPLATES_DISMISSED_KEY = "stoa.compose.templates";
const noSubscription = () => () => {};
function readTemplatesDismissed() {
  try {
    return localStorage.getItem(TEMPLATES_DISMISSED_KEY) === "off";
  } catch {
    return false;
  }
}

/** Size a textarea to its words, so it reads as a growing line, not a box. */
function fitTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
}

/**
 * Steps where the card tray and the assistant are actually of use: where
 * there is a body to drop a card into, a deck to build, or a timeline to
 * place a card on. Choosing a clip, naming a call, picking tags and
 * publishing need neither, and on those steps the rail is not shown at all.
 */
const RAIL_STEPS = new Set<StepKey>(["write", "cards", "video_edit"]);

export function StudioEditor({
  analystReportPrice,
  initialDraft,
  initialCards = [],
  hasVideoClip = false,
  aiCredits = 0,
  plans = [],
  editingPublished = false,
  hasLockedCall = false,
}: {
  analystReportPrice: number | null;
  initialDraft?: Report | null;
  /** The draft's saved deck, payloads intact (see listAuthorCards). */
  initialCards?: DraftCard[];
  /** The draft already has a clip, so it opens with its video module. */
  hasVideoClip?: boolean;
  aiCredits?: number;
  plans?: Plan[];
  /**
   * This publication is already out. The prose, the cards and the tags are
   * editable and every change is disclosed; the call, the pricing and the
   * format are frozen, so their controls are not offered.
   */
  editingPublished?: boolean;
  /** The live publication carries a call, which can never be edited. */
  hasLockedCall?: boolean;
}) {
  const initialDoc = useMemo(() => initialTiptap(initialDraft?.body), [initialDraft?.body]);

  // The format is not chosen, it is observed. A publication with a clip is a
  // video; one without is research. The old tab strip asked the creator to
  // declare this up front and then competed with the sequence that actually
  // decides it, so it is gone and this reads the answer off the work instead.
  //
  // A draft stored as a Post keeps being one: nothing in the sequence can turn
  // a Post into research, and silently converting somebody's saved note would
  // throw away its shape.
  const isPost = modeFromType(initialDraft?.type) === "short_post";

  // The file a creator picked in the video rung, held until the report is
  // locked. video_clips rows hang off a locked report, so the upload cannot
  // start until publish has returned an id.
  const videoFileRef = useRef<{ file: File; durationSeconds: number } | null>(null);
  // The ref holds the file; this holds the fact, because the sequence has to
  // re-render when a clip arrives (Edit video appears, Video reads as done).
  const [videoChosen, setVideoChosen] = useState(hasVideoClip);

  const mode: ComposeMode = isPost ? "short_post" : videoChosen ? "video" : "research";
  const type = typeFromMode(mode);

  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [summary, setSummary] = useState(initialDraft?.summary ?? "");
  const [docJson, setDocJson] = useState<JSONContent>(initialDoc);
  const [plainText, setPlainText] = useState(() => tiptapPlainText(initialDoc));
  const [ticker, setTicker] = useState(initialDraft?.ticker ?? "");
  // Whether the symbol in the field is a real, priceable name. Owned here
  // rather than in the call panel because the step's forward button has to
  // read it: a call locked on a symbol that does not resolve can never be
  // graded, so Continue refuses it. A live publication's call is frozen and
  // was checked when it was locked, so nothing is looked up for it.
  const { lookup: symbolLookup, retry: retrySymbolLookup } = useSymbolLookup(
    ticker,
    !editingPublished,
  );
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
  // Null means "follow the step". A creator who opens or closes the rail
  // themselves is obeyed until they move, and each step then gets its own
  // sensible default back rather than inheriting a decision made three steps
  // ago about a different task.
  const [railOverride, setRailOverride] = useState<boolean | null>(null);
  const [railDrawerOpen, setRailDrawerOpen] = useState(false);
  const [askSeed, setAskSeed] = useState<string | null>(null);
  const [promote, setPromote] = useState<PromoteState>(EMPTY_PROMOTE);
  const [researchDropActive, setResearchDropActive] = useState(false);
  // Null until chosen. It used to default to long, which meant a ticker on
  // its own read as a complete long call and sailed through Continue and
  // publish without the creator ever saying which way they were calling it.
  const [direction, setDirection] = useState<Direction | null>(null);
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [showTemplateStrip, setShowTemplateStrip] = useState(() =>
    isDocMostlyEmpty(null, initialDoc),
  );
  // The helper is an offer, and a creator who has taken it down once should
  // not have to take it down on every new draft. Read as an external store:
  // the server has no localStorage, so its snapshot is "not dismissed" and
  // the client corrects it on hydration without a state write in an effect.
  const templatesDismissed = useSyncExternalStore(
    noSubscription,
    readTemplatesDismissed,
    () => false,
  );
  const dismissTemplates = useCallback(() => {
    setShowTemplateStrip(false);
    try {
      localStorage.setItem(TEMPLATES_DISMISSED_KEY, "off");
    } catch {
      // Same: without storage it comes back next time, which is harmless.
    }
  }, []);
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
        direction: ticker.trim() && direction ? direction : undefined,
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

  /**
   * Saving an edit to a publication that is already out.
   *
   * Deliberately not on the autosave timer. An autosaved edit would file a
   * public disclosure every thirty seconds while the analyst was still
   * thinking, which would turn the marker into noise and make the honest
   * signal worthless. The creator saves when they mean it.
   */
  const persistEdit = useCallback(async () => {
    if (!draftId) return;
    setSaveStatus("saving");
    try {
      const cardRes = await saveCards(draftId, toStoredCards(deck));
      if (!cardRes.ok) {
        setSaveStatus("idle");
        toast.error(cardRes.error ?? "Could not save the cards.");
        return;
      }
      const res = await updatePublishedReport({
        id: draftId,
        title: type === "short_post" ? undefined : title,
        summary,
        body: type === "short_post" ? undefined : JSON.stringify(latestChangeRef.current.json),
        primary_tag: tags.primary,
        secondary_tags: tags.secondary,
        cardsChanged: cardRes.changed ?? false,
      });
      if (!res.ok) {
        setSaveStatus("idle");
        setError(res.error ?? "Could not save the edit.");
        toast.error(res.error ?? "Could not save the edit.");
        return;
      }
      setSaveStatus("saved");
      setError(null);
      dirtyRef.current = false;
      toast.success(
        (res.sections?.length ?? 0) > 0
          ? "Saved. The publication now shows an EDITED marker."
          : "Nothing had changed, so nothing was recorded.",
      );
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      setSaveStatus("idle");
      const msg = e instanceof Error ? e.message : "Could not save the edit. Try again.";
      setError(msg);
      toast.error(msg);
    }
  }, [draftId, type, title, summary, tags, deck]);

  useEffect(() => {
    if (editingPublished) return;
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
  }, [persistDraft, summary, plainText, draftId, editingPublished]);

  // First unmet publish requirement, or null when ready. Mirrors the
  // server-side enforcement in publishReport.
  // Research may publish as overview without a ticker/locked call.
  // A call is a ticker and a direction. The server only creates the graded
  // record when both arrive, so anything less must never reach it as if it
  // were a call: the call step and the publish step both refuse it below.
  const lockingCall = Boolean(ticker.trim()) && direction !== null;
  // A Post is text and nothing else. Everything else may carry a clip and may
  // carry a written thesis, and no longer has to declare which of the two it
  // is up front: the video step decides the first and the write step the
  // second, which is what the product model always said a publication was.
  const showVideo = !isPost;
  const showResearch = !isPost;

  // ── The guided sequence ────────────────────────────────────────────────
  // One step at a time on the first pass, every step jumpable afterwards.
  // Editing a live publication is never a first pass: the creator already
  // made every one of these decisions, so nothing is locked.
  const steps = useMemo(() => stepsFor(mode, videoChosen), [mode, videoChosen]);
  const [stepKey, setStepKey] = useState<StepKey>("write");
  // What the forward button said when it refused to move. Shown beside the
  // button, and only while it is still the reason.
  const [blockedNote, setBlockedNote] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<StepKey>>(() => new Set<StepKey>(["write"]));
  const [firstPassDone, setFirstPassDone] = useState(editingPublished);

  // A step can vanish under the creator: dropping the clip removes Edit
  // video, and switching format removes both. Derived rather than synced, so
  // a step leaving the sequence falls back on the same render instead of
  // painting a missing step and correcting it afterwards.
  const currentStep = steps.find((s) => s.key === stepKey) ?? steps[0]!;
  const stepIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === currentStep.key),
  );

  /**
   * The workbench frame.
   *
   * Compose fills whatever is scrolling it, and nothing inside is pinned to
   * anything else's height. The header sits in the flow; under it the toolbox
   * rail and the canvas are two columns that scroll on their own. The frame's
   * height is measured off the scroll parent (the app shell's <main>, or the
   * document on a fixture page), never assumed from the nav. The same frame
   * now carries Today, the report page and the branding studio
   * (src/lib/layout/frame.ts).
   *
   * The previous shape, a sticky header with the rail stuck under it at the
   * header's measured height, broke inside the shell: a sticky offset is taken
   * from the scroller's padding-inset edge, so the header sat 2rem below the
   * nav and over the top of the rail. Measuring the header did not help, since
   * where it sat was wrong, not how tall it was. A frame has no offsets to get
   * wrong, so the class of bug has nowhere to live.
   */
  const rootRef = useFrameHeight<HTMLDivElement>();
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const goStep = useCallback((key: StepKey) => {
    setStepKey(key);
    setRailOverride(null);
    setBlockedNote(null);
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
    // Each step is its own screen, so arriving at one starts at its top rather
    // than halfway down the last one. The canvas is the scroller, so it is
    // the canvas that moves.
    canvasRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goNext = useCallback(() => {
    const i = steps.findIndex((s) => s.key === stepKey);
    const next = steps[i + 1];
    if (next) goStep(next.key);
    // Reaching the end is what unlocks free movement.
    if (i + 1 >= steps.length - 1) setFirstPassDone(true);
  }, [steps, stepKey, goStep]);

  const goBack = useCallback(() => {
    const i = steps.findIndex((s) => s.key === stepKey);
    const prev = steps[i - 1];
    if (prev) goStep(prev.key);
  }, [steps, stepKey, goStep]);


  const contentBlockedBy: string | null = (() => {
    if (mode === "short_post") {
      const text = summary.trim();
      if (!text) return "Write your post first.";
      if (text.length > POST_MAX_CHARS) return `Posts are ${POST_MAX_CHARS} characters.`;
      return null;
    }
    // "Add a video" is gone: a publication is only a video once it has one, so
    // that gate could never fire and its only effect was to strand anyone who
    // had picked the Video tab and then had nothing to add.
    if (!title.trim()) return "Add a headline.";
    return null;
  })();

  /**
   * What the call step would say if Continue were pressed on it now. Read
   * here as well as on the step, because a half-entered call must not publish
   * either: a ticker with no direction used to go out as a publication with
   * no call at all, silently, and a symbol nobody has checked could lock a
   * call that can never be graded.
   */
  const callBlockedBy = advanceFor("call", {
    isPost,
    postMaxChars: POST_MAX_CHARS,
    title,
    postText: summary,
    ticker,
    direction,
    target,
    symbol: editingPublished ? "frozen" : symbolLookup.status,
    cards: [],
    hasVideo: videoChosen,
    hasVideoEdits: false,
    wordlessOverlays: 0,
    blankVisuals: 0,
    primaryTag: tags.primary,
  }).blocker;

  const detailsBlockedBy: string | null = (() => {
    if (callBlockedBy) return callBlockedBy;
    if (mode === "video" && !tags.primary) return "Choose a primary tag.";
    // The fact-check moved onto this step with the rest of the publishing
    // gates, so pointing at the Assistant rail sent the creator to the wrong
    // place.
    if (showResearch && plainText.trim() && !factCheck) return "Run the fact-check above.";
    if (!disclosuresAnswered(disclosure)) return "Answer all three disclosures.";
    return null;
  })();

  const publishBlockedBy = contentBlockedBy ?? detailsBlockedBy;

  /**
   * The toolbox is for building things, so it exists only on the steps that
   * build something. It used to fold to a strip of two icons on the other
   * steps, which was a stub: nothing on the call, tags or publish steps needs
   * a card deck or the assistant, so a column that only existed to be
   * reopened was width taken from the work for no reason. On those steps
   * there is no rail. On the building steps it opens by default and can be
   * folded to its icons.
   */
  const railUseful = RAIL_STEPS.has(currentStep.key);
  const railCollapsed = railOverride ?? false;

  /** What each step holds right now, for the progress rail. */
  const stepFacts: StepFacts = {
    hasWriting: mode === "short_post" ? summary.trim().length > 0 : title.trim().length > 0,
    hasCall: lockingCall && !callBlockedBy,
    cardCount: cards.length,
    hasVideo: videoChosen,
    hasVideoEdits: Boolean(
      videoEdit &&
        (videoEdit.overlays.length > 0 ||
          videoEdit.thumbnail !== null ||
          videoEdit.trimStart > 0 ||
          videoEdit.trimEnd < videoEdit.durationSeconds),
    ),
    hasTags: Boolean(tags.primary),
    readyToPublish: publishBlockedBy === null,
  };

  /**
   * Taking the video out.
   *
   * Nothing needs to be declared: the format follows the clip, so dropping
   * the clip is what makes this a written publication. Everything already
   * written is kept. Offered on the video step beside Replace, not as a
   * second forward button.
   */
  function removeVideo() {
    setVideoEdit(null);
    videoFileRef.current = null;
    setVideoChosen(false);
  }

  /** The one forward button, and what it will do. */
  const advance = advanceFor(currentStep.key, {
    isPost,
    postMaxChars: POST_MAX_CHARS,
    title,
    postText: summary,
    ticker,
    direction,
    target,
    symbol: editingPublished ? "frozen" : symbolLookup.status,
    cards: cards.map((c) => ({ name: cardName(c), empty: cardIsEmpty(c) })),
    hasVideo: videoChosen,
    hasVideoEdits: stepFacts.hasVideoEdits,
    wordlessOverlays:
      videoEdit?.overlays.filter((o) => o.kind === "text" && !o.text.trim()).length ?? 0,
    blankVisuals:
      videoEdit?.overlays.filter(
        (o) =>
          o.kind === "visual" &&
          o.source.type === "diagram" &&
          !o.source.prompt.trim() &&
          !o.source.imageUrl,
      ).length ?? 0,
    primaryTag: tags.primary,
  });
  const note = blockedNote && blockedNote === advance.blocker ? blockedNote : null;

  function pressNext() {
    if (advance.blocker) {
      // Said beside the button, where the press happened, and left there
      // until it is no longer true. Not a toast: a reason that fades is a
      // reason the creator has to re-press to read again.
      setBlockedNote(advance.blocker);
      return;
    }
    setBlockedNote(null);
    // Skipping the video is leaving it out, so the empty edit goes too.
    if (currentStep.key === "video" && !videoChosen) setVideoEdit(null);
    goNext();
  }

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
            direction: lockingCall && direction ? direction : undefined,
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
        direction: lockingCall && direction ? direction : undefined,
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

  // Publish is a step now, not a drawer over the work. The top-bar button
  // walks the creator to it rather than opening a second surface with the
  // same controls on it.
  function onDetailsClick() {
    if (contentBlockedBy) {
      toast.message(contentBlockedBy);
      return;
    }
    setFirstPassDone(true);
    goStep("publish");
  }

  function onPublishClick() {
    if (contentBlockedBy) {
      toast.message(contentBlockedBy);
      return;
    }
    if (detailsBlockedBy) {
      // The thing that is missing lives on a step, so say what it is and let
      // the creator go and fix it rather than opening a panel over the top.
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

  return (
    // The class height is only the guess for the server-rendered paint; the
    // effect above measures the real room and overrides it before first paint.
    <div
      ref={rootRef}
      data-compose-root
      className="flex h-[calc(var(--app-h)-var(--nav-h))] min-h-0 flex-col overflow-hidden"
    >
      {/* The header is one block in the flow: the bar, then the step tracker.
          Nothing sticks. The columns under it scroll, so it never has to. */}
      <div className="shrink-0 border-b border-border bg-paper">
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] md:flex-wrap md:gap-3 md:px-6">
        <Link
          href="/studio"
          className="flex items-center gap-1.5 text-sm text-text-mute transition-colors hover:text-text focus-ring rounded-[var(--radius-btn)]"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Studio</span>
        </Link>

        {railUseful ? (
          <RailOpenButton onClick={() => setRailDrawerOpen(true)} cardCount={cards.length} />
        ) : null}

        {/* What this publication currently is, read off its contents. Not a
            control: the Video step is where a clip is added or left out, and a
            second place to declare the same thing only competed with it. */}
        <span
          className="num hidden shrink-0 text-[10px] uppercase tracking-[0.16em] text-text-faint md:inline"
          aria-live="polite"
        >
          {types.find((t) => t.key === mode)?.label ?? "Draft"}
        </span>

        <span className="t-meta min-w-14 text-[11px]" aria-live="polite">
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Draft"}
        </span>
        {error && (
          <span className="t-meta max-w-[14rem] truncate text-[11px] text-[var(--down)]" role="alert">
            {error}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {editingPublished ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewOpen(true)}
              >
                Preview
              </Button>
              <Button
                size="sm"
                disabled={savingDraft}
                onClick={() => startDraft(() => persistEdit())}
                className="shrink-0"
              >
                <FloppyDisk size={16} />
                {savingDraft ? "Saving..." : "Save changes"}
              </Button>
            </>
          ) : (
            <>
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
                className="hidden sm:inline-flex"
                onClick={() => setPreviewOpen(true)}
              >
                Preview
              </Button>
              <Button size="sm" disabled={pending} onClick={onDetailsClick} className="shrink-0">
                <RocketLaunch size={15} weight="fill" />
                {pending ? "Publishing..." : "Publish"}
              </Button>
            </>
          )}
        </div>
      </div>

        <StepNav
          steps={steps}
          current={currentStep.key}
          stateOf={(k) => stepState(k, stepFacts)}
          reachable={(k) => firstPassDone || visited.has(k)}
          onGo={goStep}
        />
      </div>

      {/* LEFT is what you build with, the sequence is what you publish as. */}
      <div className="flex min-h-0 min-w-0 flex-1">
        {railUseful ? (
          <ComposeRail
            collapsed={railCollapsed}
            onToggle={() => setRailOverride(!railCollapsed)}
            cardCount={cards.length}
          >
            {toolbox}
          </ComposeRail>
        ) : null}

        {/* Canvas: the guided sequence, one step at a time. Compose is a
            working surface, not an article, so the canvas takes the standard
            page width rather than a reading measure: a timeline, a deck and
            a publish panel all want the room, and a column of dead paper on
            either side of the work was the single biggest waste on the page.
            Only the prose keeps a measure, and that is set on the editor. */}
        <div
          ref={canvasRef}
          className="scroll-area min-h-0 min-w-0 flex-1 overflow-y-auto pb-[var(--tab-h)]"
        >
          <div
            className={cn(
              "mx-auto w-full px-4 py-6 md:px-8",
              currentStep.key === "write" ? "max-w-[60rem]" : "max-w-[var(--w-standard)]",
            )}
          >
            {/* Editing something already published is a different act from
                writing a draft, and the creator should know what it costs
                before they type. Brass, not rust: correcting yourself in the
                open is the right thing to do. */}
            {editingPublished ? (
              <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--brass)]/50 bg-[var(--brass)]/10 p-3.5">
                <p className="num text-[10px] uppercase tracking-[0.16em] text-text-faint">
                  This publication is live
                </p>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-text">
                  You can change the headline, the standfirst, the thesis, the cards and
                  the tags. Saving records an EDITED marker on the publication showing what
                  changed and when, which readers can open.
                </p>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-text-mute">
                  {hasLockedCall
                    ? "The call and its entry price cannot change, and neither can its resolution. Those are the record."
                    : "The format, the pricing and the access setting cannot change."}
                </p>
              </div>
            ) : null}

            <StepFrame
              step={currentStep}
              index={stepIndex}
              total={steps.length}
              onBack={stepIndex > 0 ? goBack : null}
              next={
                stepIndex < steps.length - 1
                  ? { label: advance.label, onPress: pressNext }
                  : null
              }
              note={note}
            >
              {/* WRITE. Always mounted, hidden off-step: the Tiptap instance
                  holds the charts the publish path screenshots, and losing it
                  on a step change would lose them. Prose is the one thing on
                  the canvas that wants a measure, so the column is capped
                  here and nowhere else. */}
              <div className={cn(currentStep.key !== "write" && "hidden")}>
                {type !== "short_post" && (
                  <>
                    <label htmlFor="report-title" className="sr-only">
                      Headline
                    </label>
                    {/* A textarea, not an input: a headline is one thought
                        but rarely one line, and an input clips whatever a
                        390px screen cannot hold. It grows with its words and
                        Enter moves on rather than breaking the line. */}
                    <textarea
                      id="report-title"
                      value={title}
                      rows={1}
                      onChange={(e) => {
                        setTitle(e.target.value.replace(/\n/g, " "));
                        fitTextarea(e.currentTarget);
                      }}
                      ref={fitTextarea}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          document.getElementById("report-summary")?.focus();
                        }
                      }}
                      placeholder="Headline"
                      dir="auto"
                      className="user-copy mb-2 w-full resize-none overflow-hidden bg-transparent text-3xl font-semibold leading-tight tracking-tight text-text placeholder:text-text-mute focus:outline-none md:text-4xl"
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
                    <p className="num mb-5 text-[11px] uppercase tracking-[0.12em] text-text-faint">
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
                    className="user-copy mb-5 w-full bg-transparent text-lg text-text-mute placeholder:text-text-faint focus:outline-none"
                  />
                )}

                <div className={cn(!showResearch && "hidden")}>
                  {showTemplateStrip && !templatesDismissed && (
                    <ReportTemplateStrip onApply={applyTemplate} onDismiss={dismissTemplates} />
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
                </div>
              </div>

              {/* THE CALL. */}
              {currentStep.key === "call" ? (
                <LockPublishPanel
                  sections="call"
                  hasCard={hasCard}
                  ticker={ticker}
                  onTicker={setTicker}
                  lookup={symbolLookup}
                  onRetryLookup={retrySymbolLookup}
                  frozen={editingPublished}
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
                  publishLabel=""
                  publishDisabledReason={null}
                  onPublish={() => {}}
                  pending={false}
                  error={null}
                />
              ) : null}

              {/* CARDS. An invitation, not a hurdle: what a card is, what it
                  does for the reader, and one obvious way to make one. */}
              {currentStep.key === "cards" ? (
                <div>
                  {cards.length === 0 ? (
                    <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface p-5">
                      <p className="text-[0.9375rem] leading-relaxed text-text">
                        A card is the claim on its own: the thesis in two lines, where your
                        numbers differ from the street, the arithmetic that gets you to the
                        target, or what would prove you wrong.
                      </p>
                      <p className="mt-2 text-[0.875rem] leading-relaxed text-text-mute">
                        Readers see cards first, in the Feed and above the thesis, and they
                        are what a reader remembers. They carry your provenance marks, and
                        you decide which ones sit behind the paywall.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setLibraryOpen(true)}
                          className="focus-ring rounded-[var(--radius-btn)] bg-[var(--ink)] px-4 py-2 text-[0.8125rem] font-medium text-[var(--paper)] transition-opacity hover:opacity-90"
                        >
                          Make the first card
                        </button>
                        <button
                          type="button"
                          onClick={() => runAssistant(ASSISTANT_ACTIONS[0]!)}
                          className="focus-ring rounded-[var(--radius-btn)] border border-border px-4 py-2 text-[0.8125rem] text-text-mute transition-colors hover:border-[var(--ink)] hover:text-text"
                        >
                          Draft them from what I have written
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-wrap gap-3">
                        {cards.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCardId(c.id)}
                            className="focus-ring w-[220px] shrink-0 rounded-[var(--radius-card)] text-left"
                          >
                            <CardPreview card={c} compact />
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setLibraryOpen(true)}
                          className="focus-ring rounded-[var(--radius-btn)] border border-border px-4 py-2 text-[0.8125rem] text-text-mute transition-colors hover:border-[var(--ink)] hover:text-text"
                        >
                          Add another card
                        </button>
                      </div>
                      <p className="mt-4 text-[0.8125rem] leading-relaxed text-text-mute">
                        Drag a card from the toolbox into your text to place it in the
                        thesis, or onto the timeline to make it appear in the video.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* VIDEO and EDIT VIDEO share one rung, so the loaded clip and
                  its object URL survive the move between the two steps. */}
              {showVideo ? (
                <div
                  className={cn(
                    currentStep.key !== "video" && currentStep.key !== "video_edit" && "hidden",
                  )}
                >
                  {currentStep.key === "video_edit" && clipSeconds > 0 && feedPreviewSeconds ? (
                    <p className="mb-4 text-[0.8125rem] leading-snug text-text-mute">
                      This clip is longer than the Feed budget. The Feed will play the first{" "}
                      {feedPreviewSeconds} seconds. The full video stays on Explore and your
                      profile.
                    </p>
                  ) : currentStep.key === "video_edit" && clipSeconds > 0 ? (
                    <p className="mb-4 text-[0.8125rem] leading-snug text-text-mute">
                      This clip fits the Feed. Readers will see the whole thing there.
                    </p>
                  ) : null}
                  <VideoRung
                    stage={currentStep.key === "video" ? "choose" : "edit"}
                    value={videoEdit ?? undefined}
                    onChange={setVideoEdit}
                    onFile={(file, durationSeconds) => {
                      videoFileRef.current = { file, durationSeconds };
                      setVideoChosen(true);
                    }}
                    hasClip={videoChosen}
                    onRemove={removeVideo}
                    cards={deck}
                    chrome={false}
                    ticker={ticker.trim() || undefined}
                  />
                </div>
              ) : null}

              {/* TAGS. */}
              {currentStep.key === "tags" ? (
                <div className="flex flex-col gap-4">
                  <TagPicker
                    value={tags}
                    onChange={setTags}
                    hasCall={lockingCall}
                    callSector={
                      lockingCall
                        ? (UNIVERSE.find((u) => u.ticker === ticker.trim().toUpperCase())?.sector ??
                          null)
                        : null
                    }
                  />
                  <CompanionPicker
                    currentId={draftId}
                    mode={mode}
                    value={linkedReportId}
                    onChange={setLinkedReportId}
                  />
                </div>
              ) : null}

              {/* PUBLISH. */}
              {currentStep.key === "publish" ? (
                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="focus-ring w-full rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2 text-left text-[0.8125rem] text-text hover:border-[var(--ink)]"
                  >
                    Preview publication
                  </button>
                  {showResearch ? (
                    <FactCheckerPanel
                      text={plainText}
                      credits={credits}
                      initialResult={factCheck}
                      onCreditsChange={setCredits}
                      onResult={setFactCheck}
                    />
                  ) : null}
                  <LockPublishPanel
                    sections="publish"
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
                </div>
              ) : null}
            </StepFrame>
          </div>
        </div>
      </div>

      {railUseful ? (
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
