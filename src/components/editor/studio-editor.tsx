"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { FloppyDisk, SquaresFour } from "@phosphor-icons/react";
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
import { SaveStatus } from "@/components/compose/save-status";
import { LeaveDialog } from "@/components/compose/leave-dialog";
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
import { ComposeHeader } from "@/components/compose/compose-header";
import { FeaturesMenu, type FeatureRow } from "@/components/compose/features-menu";
import { PromotePanel } from "@/components/compose/promote-panel";
import { VerdictCallPanel } from "@/components/compose/verdict-call-panel";
import { VerdictVisibility } from "@/components/compose/verdict-visibility";
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
import {
  emptyEdit,
  fmtTimecode,
  fromStoredVideoEdit,
  toStoredVideoEdit,
  type VideoEdit,
} from "@/lib/compose/overlays";
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
  featuresFor,
  roleOf,
  spineFor,
  stepDef,
  stepState,
  type AdvanceInput,
  type StepFacts,
  type StepKey,
} from "@/lib/compose/steps";
import { spineProgress } from "@/lib/compose/drafts";
import { StepFrame, StepNav } from "@/components/compose/step-nav";
import { DevCrash, StepErrorBoundary } from "@/components/compose/step-boundary";
import {
  BRIEF_MAX_CHARS,
  clipPlayableSeconds,
  contentTypeFor,
  feedPreviewSecondsForClip,
  publicationTypeDef,
  publicationTypeFrom,
  type PublicationType,
} from "@/lib/compose/modes";
import {
  VERDICT_HORIZON_DEFAULT_DAYS,
  verdictEligibility,
  verdictWindow,
  type VerdictEligibility,
} from "@/lib/compose/verdict";

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
  // A hidden field measures as scrollHeight 0, which would lock it at no
  // height. Only a visible one is fitted.
  if (el.offsetParent === null) return;
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
}

/**
 * Screens where the card tray and the assistant are of use: where there is
 * a body to drop a card into, a deck to build, or a timeline to place a card
 * on. Naming a call, writing a headline, picking tags and publishing need
 * neither, and on those screens the rail is not shown at all.
 */
const RAIL_STEPS = new Set<StepKey>(["thesis", "cards", "video"]);

export function StudioEditor({
  analystReportPrice,
  initialDraft,
  initialType,
  initialCards = [],
  hasVideoClip = false,
  aiCredits = 0,
  plans = [],
  editingPublished = false,
  hasLockedCall = false,
  verdictLastPublishedAt = null,
  popularTags = [],
}: {
  analystReportPrice: number | null;
  initialDraft?: Report | null;
  /** The type chosen on the picker, for a publication that has no row yet. */
  initialType?: PublicationType;
  /** When the analyst's last verdict went out, for the rolling thirty-day window. */
  verdictLastPublishedAt?: string | null;
  /** Tag slugs by use across published work, most used first, for the tag search. */
  popularTags?: string[];
  /** The draft's saved deck, payloads intact (see listAuthorCards). */
  initialCards?: DraftCard[];
  /** The draft already has a clip, so it opens with its video module. */
  hasVideoClip?: boolean;
  aiCredits?: number;
  plans?: Plan[];
  /**
   * This publication is already out. The prose, the cards and the tags are
   * editable and every change is disclosed; the call, the pricing and the
   * type are frozen, so their controls are not offered.
   */
  editingPublished?: boolean;
  /** The live publication carries a call, which can never be edited. */
  hasLockedCall?: boolean;
}) {
  const initialDoc = useMemo(() => initialTiptap(initialDraft?.body), [initialDraft?.body]);

  // The type was chosen on the picker and is stored with the draft. It is
  // what the spine and the features menu are built from, and it does not
  // change: a brief that grows into a thesis is a new thesis.
  const pubType: PublicationType = initialDraft?.type
    ? publicationTypeFrom(initialDraft.type)
    : (initialType ?? "thesis");
  const typeDef = publicationTypeDef(pubType);
  const type = contentTypeFor(pubType);
  const isBrief = pubType === "brief";
  const isVerdict = pubType === "verdict";
  // The writer (the Tiptap editor) exists on every type but a brief: it is
  // the thesis's content step and an optional feature on the others.
  const hasWriter = !isBrief;
  const spine = useMemo(() => spineFor(pubType), [pubType]);
  const features = useMemo(() => featuresFor(pubType), [pubType]);
  // Read once, when the workspace opens: the window is a fact about the
  // analyst's record, and render must not depend on the clock.
  const [vWindow] = useState(() => verdictWindow(verdictLastPublishedAt));

  // The file a creator picked in the video rung, held until the report is
  // locked. video_clips rows hang off a locked report, so the upload cannot
  // start until publish has returned an id.
  const videoFileRef = useRef<{ file: File; durationSeconds: number } | null>(null);
  // The ref holds the file; this holds the fact, because the screen has to
  // re-render when a clip arrives (the video step reads as done).
  const [videoChosen, setVideoChosen] = useState(hasVideoClip);

  const [title, setTitle] = useState(initialDraft?.title ?? "");
  // The dek on every type but a brief, where it is the brief's own text.
  const [summary, setSummary] = useState(initialDraft?.summary ?? "");
  // What the Tiptap editor is built from. Normally the draft; after the
  // writer has been redrawn following a failure, the latest words, so
  // nothing typed since the last save is lost to the redraw.
  const [editorSeed, setEditorSeed] = useState<JSONContent>(initialDoc);
  // The chosen clip's object URL, kept here so the video screen can be
  // redrawn with the same picture. The file itself is in videoFileRef.
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [docJson, setDocJson] = useState<JSONContent>(initialDoc);
  const [plainText, setPlainText] = useState(() => tiptapPlainText(initialDoc));
  const [ticker, setTicker] = useState(initialDraft?.ticker ?? "");
  // Whether the symbol in the field is a real, priceable name. Owned here
  // rather than in the call panel because the forward button has to read
  // it: a call locked on a symbol that does not resolve can never be
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

  // Seeded from the stored edit when the draft has one, so overlays placed
  // in an earlier session come back rather than being lost to a reload.
  const [videoEdit, setVideoEdit] = useState<VideoEdit | null>(() => {
    const stored = fromStoredVideoEdit(initialDraft?.video_edit);
    if (stored) return stored;
    return hasVideoClip || pubType === "video" ? emptyEdit(90) : null;
  });

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
  // Null means "follow the screen". A creator who opens or closes the rail
  // themselves is obeyed until they move, and each screen then gets its own
  // sensible default back.
  const [railOverride, setRailOverride] = useState<boolean | null>(null);
  const [railDrawerOpen, setRailDrawerOpen] = useState(false);
  const [askSeed, setAskSeed] = useState<string | null>(null);
  const [promote, setPromote] = useState<PromoteState>(EMPTY_PROMOTE);
  const [researchDropActive, setResearchDropActive] = useState(false);
  // The call. Null direction until chosen: a ticker on its own is not a
  // call. Seeded from the draft-call columns when the database has them.
  const [direction, setDirection] = useState<Direction | null>(initialDraft?.draft_direction ?? null);
  const [target, setTarget] = useState(
    initialDraft?.draft_target_price != null ? String(initialDraft.draft_target_price) : "",
  );
  const [horizon, setHorizon] = useState(
    initialDraft?.draft_horizon_days ?? (isVerdict ? VERDICT_HORIZON_DEFAULT_DAYS : 30),
  );
  // A verdict is subscribers-only while it is open; the setting is not
  // offered on it.
  const [access, setAccess] = useState<AccessType>(
    isVerdict ? "subscribers" : (initialDraft?.access ?? "free"),
  );
  const [membersIncluded, setMembersIncluded] = useState(Boolean(initialDraft?.members_included));
  const [linkedReportId, setLinkedReportId] = useState<string | null>(initialDraft?.linked_report_id ?? null);
  const [minPlanRank, setMinPlanRank] = useState(initialDraft?.min_plan_rank ?? 0);
  const [requiredPerks, setRequiredPerks] = useState<string[]>(initialDraft?.required_perks ?? []);
  const [price, setPrice] = useState(initialDraft?.price ?? analystReportPrice ?? 7);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraft?.id);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  // The draft's true state for the status line: unsaved changes, saving,
  // saved (and when), or a failure with its reason. `dirty` mirrors dirtyRef
  // for rendering; the ref stays the synchronous truth for the timer and
  // the guards.
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Said once on the call screen when the database could not keep the
  // call's direction, target and horizon between sessions (migration 0065).
  const [callDraftNote, setCallDraftNote] = useState<string | null>(null);
  // An in-app link pressed with unsaved changes, held until the creator
  // decides whether to save, leave, or stay.
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
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
  // Counts edits, so a save that finishes after a later edit cannot mark the
  // draft clean.
  const editGenRef = useRef(0);
  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    editGenRef.current += 1;
    setDirty(true);
  }, []);
  /** Wraps a setter so the change counts as unsaved work. */
  const dirtying = useCallback(
    <T,>(set: (v: T) => void) =>
      (v: T) => {
        set(v);
        markDirty();
      },
    [markDirty],
  );
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards the 30s autosave from firing while doPublish is in flight -- without
  // this, a tick landing mid-publish can write status:"draft" and a stale body
  // over a row publishReport just (or is concurrently) flipping to "published".
  const isPublishingRef = useRef(false);

  const hasCard = true;
  const bodyJson = useMemo(() => JSON.stringify(docJson), [docJson]);

  const onEditorChange = useCallback((change: { json: JSONContent; text: string }) => {
    latestChangeRef.current = change;
    markDirty();
    setResearchCardIds(collectCardIds(change.json));
    if (change.text.trim().length > 40) setShowTemplateStrip(false);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    // Debounce parent state so keystrokes don't re-render the editor tree and
    // kill the slash-menu popup mid-open.
    syncTimerRef.current = setTimeout(() => {
      setDocJson(change.json);
      setPlainText(change.text);
    }, 500);
  }, [markDirty]);

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
    markDirty();
  }, [setSelectedCardId, markDirty]);

  const updateCard = useCallback((next: DraftCard) => {
    setCards((cs) => cs.map((c) => (c.id === next.id ? next : c)));
    markDirty();
  }, [markDirty]);

  const deleteCard = useCallback((id: string) => {
    setCards((cs) => cs.filter((c) => c.id !== id));
    setSelectedCardId(null);
    markDirty();
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
  }, [markDirty]);

  const reorderCards = useCallback((cardId: string, toIndex: number) => {
    setCards((cs) => {
      const from = cs.findIndex((c) => c.id === cardId);
      if (from < 0) return cs;
      return moveCard(cs, from, toIndex);
    });
    markDirty();
  }, [markDirty]);

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
      markDirty();
      toast.success(`${cardName(card)} added to the video`);
    },
    [cards, markDirty],
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
      markDirty();
      toast.success(`${cardName(card)} added to the text`);
    },
    [cards, setRailDrawerOpen, markDirty],
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
        markDirty();
        const json = e.getJSON();
        latestChangeRef.current = { json, text: tiptapPlainText(json) };
        setDocJson(json);
        setPlainText(latestChangeRef.current.text);
        toast.success(`${tpl.name} applied`);
      }
    },
    [ticker, markDirty],
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
    videoChosen && videoEdit
      ? clipPlayableSeconds(videoEdit.trimStart, videoEdit.trimEnd, videoEdit.durationSeconds)
      : 0;
  const feedPreviewSeconds = videoChosen ? feedPreviewSecondsForClip(clipSeconds) : null;

  // The words a save sends: a brief's text is its summary; every other type
  // has a dek and, when it has been written, a body.
  const summaryToSave = isBrief ? summary : summary || plainText.slice(0, 280);

  const persistDraft = useCallback(async () => {
    if (isPublishingRef.current) return;
    const gen = editGenRef.current;
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await saveDraft({
        id: draftId,
        type,
        title,
        summary: summaryToSave,
        body: isBrief ? undefined : JSON.stringify(latestChangeRef.current.json),
        access,
        price: access === "paid" ? Number(price) : null,
        members_included: membersIncluded,
        linked_report_id: linkedReportId,
        feed_preview_seconds: feedPreviewSeconds,
        min_plan_rank: access === "subscribers" ? minPlanRank : 0,
        required_perks: access === "subscribers" ? requiredPerks : [],
        ticker: ticker.trim() ? ticker : null,
        direction: ticker.trim() && direction ? direction : undefined,
        target_price: ticker.trim() && target ? Number(target) : null,
        horizon_days: ticker.trim() ? horizon : undefined,
        primary_tag: tags.primary,
        secondary_tags: tags.secondary,
        video_edit: videoChosen ? toStoredVideoEdit(videoEdit, deck) : null,
      });
      setDraftId(res.id);
      if (res.videoEditError) toast.error(res.videoEditError);
      if (res.callDraftError && ticker.trim()) setCallDraftNote(res.callDraftError);
      // Cards need the report id, so they are written after the draft row
      // exists. A card failure must not read as a lost draft: the words are
      // already saved by this point.
      if (res.id) {
        const cardRes = await saveCards(res.id, toStoredCards(deck));
        if (!cardRes.ok) toast.error(cardRes.error ?? "Could not save the cards.");
      }
      setSaveStatus("saved");
      setSavedAt(Date.now());
      setError(null);
      // Only clean if nothing changed while the save was in flight.
      if (editGenRef.current === gen) {
        dirtyRef.current = false;
        setDirty(false);
      }
    } catch (e) {
      setSaveStatus("idle");
      const msg = e instanceof Error ? e.message : "Could not save draft. Try again.";
      setSaveError(msg);
      setError(msg);
      toast.error(msg);
    }
  }, [
    draftId,
    type,
    title,
    summaryToSave,
    isBrief,
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
    tags,
    deck,
    feedPreviewSeconds,
    videoChosen,
    videoEdit,
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
    const gen = editGenRef.current;
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const cardRes = await saveCards(draftId, toStoredCards(deck));
      if (!cardRes.ok) {
        setSaveStatus("idle");
        setSaveError(cardRes.error ?? "Could not save the cards.");
        toast.error(cardRes.error ?? "Could not save the cards.");
        return;
      }
      const res = await updatePublishedReport({
        id: draftId,
        title,
        summary,
        body: isBrief ? undefined : JSON.stringify(latestChangeRef.current.json),
        primary_tag: tags.primary,
        secondary_tags: tags.secondary,
        cardsChanged: cardRes.changed ?? false,
      });
      if (!res.ok) {
        setSaveStatus("idle");
        setSaveError(res.error ?? "Could not save the edit.");
        setError(res.error ?? "Could not save the edit.");
        toast.error(res.error ?? "Could not save the edit.");
        return;
      }
      setSaveStatus("saved");
      setSavedAt(Date.now());
      setError(null);
      if (editGenRef.current === gen) {
        dirtyRef.current = false;
        setDirty(false);
      }
      toast.success(
        (res.sections?.length ?? 0) > 0
          ? "Saved. The publication now shows an EDITED marker."
          : "Nothing had changed, so nothing was recorded.",
      );
    } catch (e) {
      setSaveStatus("idle");
      const msg = e instanceof Error ? e.message : "Could not save the edit. Try again.";
      setSaveError(msg);
      setError(msg);
      toast.error(msg);
    }
  }, [draftId, title, summary, isBrief, tags, deck]);

  // Anything a save would keep. A headline or a ticker on its own used to be
  // ignored by the timer, which only counted words and cards.
  const hasAnything =
    Boolean(draftId) ||
    Boolean(title.trim() || summary.trim() || plainText.trim() || ticker.trim() || tags.primary) ||
    cards.length > 0 ||
    Boolean(videoEdit && videoEdit.overlays.length > 0);

  useEffect(() => {
    if (editingPublished) return;
    const t = setInterval(() => {
      if (!dirtyRef.current || !hasAnything) return;
      void persistDraft();
    }, 30_000);
    return () => clearInterval(t);
  }, [persistDraft, hasAnything, editingPublished]);

  /**
   * Leaving without noticing. A reload, a closed tab or a typed address is
   * stopped by the browser's own prompt while there is unsaved work; a tab
   * going to the background saves at once, since a phone may never bring it
   * back. Publishing navigates on purpose and is never interrupted.
   */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || isPublishingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      if (!dirtyRef.current || isPublishingRef.current || editingPublished || !hasAnything) return;
      void persistDraft();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [persistDraft, editingPublished, hasAnything]);

  /**
   * The same guard for the app's own links (the top nav, the phone tabs, the
   * Studio arrow): a same-origin link pressed with unsaved work is held, and
   * the creator chooses to save and go, go without saving, or stay. Caught
   * in the capture phase, before Next's router sees the click.
   */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || isPublishingRef.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // A call is a ticker and a direction. The server only creates the graded
  // record when both arrive, so anything less must never reach it as if it
  // were a call: the call screen and the publish screen both refuse it below.
  const lockingCall = Boolean(ticker.trim()) && direction !== null;

  // ── The spine ──────────────────────────────────────────────────────────
  // Three steps, one at a time on the first pass, every step a tab
  // afterwards. A reopened draft starts at the first step it has not
  // finished; a live publication is never a first pass, so nothing is locked.
  const [stepKey, setStepKey] = useState<StepKey>(() => {
    if (editingPublished) return isBrief || pubType === "thesis" ? spine[0]!.key : "headline";
    const facts = {
      hasContent:
        pubType === "video"
          ? hasVideoClip
          : pubType === "brief"
            ? Boolean(initialDraft?.summary?.trim())
            : pubType === "thesis"
              ? tiptapPlainText(initialDoc).trim().length > 0
              : Boolean(
                  initialDraft?.ticker?.trim() &&
                    initialDraft.draft_direction &&
                    initialDraft.draft_target_price != null,
                ),
      hasTitle: Boolean(initialDraft?.title?.trim()),
      hasTags: Boolean(initialDraft?.primary_tag),
    };
    const at = spineProgress(facts).resumeAt;
    return at === 3 ? "publish" : spine[at]!.key;
  });
  const [blockedNote, setBlockedNote] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<StepKey>>(() => {
    // Everything up to where the draft resumes has been walked.
    const idx = stepKey === "publish" ? spine.length : spine.findIndex((s) => s.key === stepKey);
    return new Set<StepKey>(spine.slice(0, Math.max(0, idx) + 1).map((s) => s.key));
  });
  const [firstPassDone, setFirstPassDone] = useState(editingPublished || stepKey === "publish");

  const role = roleOf(pubType, stepKey);
  const current = stepDef(pubType, stepKey);
  const spineIndex = spine.findIndex((s) => s.key === stepKey);

  /**
   * The workbench frame.
   *
   * Compose fills whatever is scrolling it, and nothing inside is pinned to
   * anything else's height. The header sits in the flow; under it the toolbox
   * rail and the canvas are two columns that scroll on their own. The frame's
   * height is measured off the scroll parent (the app shell's <main>, or the
   * document on a fixture page), never assumed from the nav. See
   * src/lib/layout/frame.ts for why this is a frame and not a sticky header.
   */
  const router = useRouter();
  const rootRef = useFrameHeight<HTMLDivElement>();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const titleAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (stepKey !== "headline") return;
    fitTextarea(titleAreaRef.current);
  }, [stepKey, title]);

  const goStep = useCallback(
    (key: StepKey) => {
      // A screen change is a natural checkpoint: whatever this screen holds
      // is written before the next one draws, so no transition can lose work.
      if (!editingPublished && dirtyRef.current && hasAnything) void persistDraft();
      setStepKey(key);
      setRailOverride(null);
      setBlockedNote(null);
      setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
      // Each screen is its own, so arriving at one starts at its top rather
      // than halfway down the last one. The canvas is the scroller.
      canvasRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [editingPublished, hasAnything, persistDraft],
  );

  const goNext = useCallback(() => {
    const i = spine.findIndex((s) => s.key === stepKey);
    const next = spine[i + 1];
    if (next) {
      goStep(next.key);
      return;
    }
    // The end of the spine is the publish screen, and reaching it is what
    // unlocks free movement.
    setFirstPassDone(true);
    goStep("publish");
  }, [spine, stepKey, goStep]);

  const goBack = useCallback(() => {
    const i = spine.findIndex((s) => s.key === stepKey);
    const prev = spine[i - 1];
    if (prev) goStep(prev.key);
  }, [spine, stepKey, goStep]);

  // The verdict's own check on the name in the field. Owned here because
  // the forward button and the publish button both read it.
  const eligibility: VerdictEligibility | null =
    isVerdict && !editingPublished && symbolLookup.status === "found"
      ? verdictEligibility(symbolLookup.resolved)
      : null;

  /** Everything the forward button needs to know, as plain values. */
  const advanceInput: AdvanceInput = {
    title,
    briefText: summary,
    briefMaxChars: BRIEF_MAX_CHARS,
    bodyText: plainText,
    ticker,
    direction,
    target,
    horizon,
    symbol: editingPublished ? "frozen" : symbolLookup.status,
    eligibility,
    cards: cards.map((c) => ({ name: cardName(c), empty: cardIsEmpty(c) })),
    hasVideo: videoChosen,
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
  };

  /**
   * The first thing standing between this publication and publish, in the
   * order the creator would fix it: the spine first, then any feature that
   * was opened and left half done, then the disclosures. Mirrors the
   * server-side enforcement in publishReport.
   */
  const spineBlockedBy =
    spine.map((s) => advanceFor(pubType, s.key, advanceInput).blocker).find(Boolean) ?? null;
  const featureBlockedBy =
    (["call", "cards", "thesis", "video"] as StepKey[])
      .filter((k) => roleOf(pubType, k) === "feature")
      .map((k) => advanceFor(pubType, k, advanceInput).blocker)
      .find(Boolean) ?? null;
  const detailsBlockedBy: string | null = (() => {
    if (featureBlockedBy) return featureBlockedBy;
    if (isVerdict && !editingPublished && !vWindow.open) {
      return `${vWindow.line}. One verdict per rolling thirty days; this one is saved as a draft.`;
    }
    // The fact-check is offered on this screen and encouraged, never required:
    // a creator publishes without it, and its result travels with the piece
    // when they do run it.
    if (!disclosuresAnswered(disclosure)) return "Answer all three disclosures.";
    return null;
  })();
  const publishBlockedBy = spineBlockedBy ?? detailsBlockedBy;

  /**
   * The toolbox is for building things, so it exists only on the screens
   * that build something. On the others there is no rail. On the building
   * screens it opens by default and can be folded to its icons.
   */
  const railUseful = RAIL_STEPS.has(stepKey);
  const railCollapsed = railOverride ?? false;

  /** What each step holds right now, for the tracker and the menu. */
  const stepFacts: StepFacts = {
    hasVideo: videoChosen,
    hasBrief: summary.trim().length > 0,
    hasThesis: plainText.trim().length > 0,
    hasCall: lockingCall && advanceFor(pubType, "call", advanceInput).blocker === null,
    cardCount: cards.length,
    hasTitle: title.trim().length > 0,
    hasTags: Boolean(tags.primary),
    readyToPublish: publishBlockedBy === null,
  };

  /** The menu's rows: what each feature holds, or why it is half done. */
  const featureRows: FeatureRow[] = features.map((def) => {
    const blocker = advanceFor(pubType, def.key, advanceInput).blocker;
    let added: string | null = null;
    switch (def.key) {
      case "call":
        added = stepFacts.hasCall
          ? [ticker.trim().toUpperCase(), direction, target ? `target ${target}` : null].filter(Boolean).join(" · ")
          : null;
        break;
      case "cards":
        added = cards.length > 0 ? `${cards.length} ${cards.length === 1 ? "card" : "cards"}` : null;
        break;
      case "thesis": {
        const n = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
        added = n > 0 ? `${n.toLocaleString("en-US")} words` : null;
        break;
      }
      case "video":
        added = videoChosen ? (clipSeconds > 0 ? fmtTimecode(clipSeconds) : "clip chosen") : null;
        break;
    }
    return {
      def,
      added,
      halfDone: blocker,
      // A live publication's call and clip are the record; they open to
      // be read, never to be changed, and cannot be added after the fact.
      locked: editingPublished && (def.key === "call" || def.key === "video") && !added,
    };
  });

  /**
   * Taking the video out. Everything already written is kept. Offered on
   * the video screen beside Replace, not as a second forward button.
   */
  function removeVideo() {
    setVideoEdit(null);
    videoFileRef.current = null;
    setClipUrl(null);
    setVideoChosen(false);
  }

  /** The one forward button, and what it will do. */
  const advance = advanceFor(pubType, stepKey, advanceInput);
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
    if (role === "feature") {
      // Skipping the video is leaving it out, so the empty edit goes too.
      if (stepKey === "video" && !videoChosen) setVideoEdit(null);
      goStep("publish");
      return;
    }
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
            summary: summaryToSave,
            body: isBrief ? undefined : JSON.stringify(editor.getJSON()),
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
            video_edit: videoChosen ? toStoredVideoEdit(videoEdit, deck) : null,
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

      const finalBody = isBrief ? undefined : editor ? JSON.stringify(editor.getJSON()) : bodyJson;

      // A chosen clip can only attach to a locked report, so hold the redirect,
      // publish, upload, then navigate. Without this the clip was never sent
      // anywhere: the rung only ever held a local object URL.
      const pendingVideo = videoChosen ? videoFileRef.current : null;

      const published = await publishReport({
        id,
        type,
        title,
        summary: summaryToSave,
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
        video_edit: videoChosen ? toStoredVideoEdit(videoEdit, deck) : null,
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
    summaryToSave,
    isBrief,
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
    videoChosen,
    videoEdit,
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

  function onPublishClick() {
    if (publishBlockedBy) {
      // The thing that is missing lives on a screen, so say what it is and
      // let the creator go and fix it rather than opening a panel over it.
      toast.message(publishBlockedBy);
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

  /* LEFT: the deck, then the assistant. */
  const toolbox = (
    <>
      <CardTray
        cards={deck}
        usage={usage}
        selectedId={selectedCardId}
        onSelect={setSelectedCardId}
        onAdd={() => setLibraryOpen(true)}
        onReorder={reorderCards}
        onPlaceInVideo={placeCardInVideo}
        onPlaceInResearch={placeCardInResearch}
        hasVideo={videoChosen}
        hasResearch={hasWriter}
      />
      <AiAssistant
        onRun={runAssistant}
        credits={credits}
        askOpen={askOpen}
        onAsk={() => {
          setAskOpen(true);
          setRailDrawerOpen(false);
        }}
      >
        {hasWriter ? (
          <FactCheckerPanel
            text={plainText}
            credits={credits}
            initialResult={factCheck}
            onCreditsChange={setCredits}
            onResult={setFactCheck}
          />
        ) : null}
        {hasWriter && editor ? (
          <VisualizeSelectionMenu
            editor={editor}
            reportTicker={ticker || undefined}
            variant="button"
          />
        ) : null}
        {hasWriter ? (
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

  /** The heading over the screen, by what kind of screen it is. */
  const eyebrow =
    role === "spine"
      ? `Step ${spineIndex + 1} of ${spine.length}`
      : role === "feature"
        ? `Add to this ${typeDef.key} · optional`
        : stepFacts.readyToPublish
          ? "Ready when you are"
          : "Almost there";

  const back =
    role === "spine"
      ? spineIndex > 0
        ? { label: "Back", onPress: goBack }
        : null
      : role === "feature"
        ? { label: "Back to publish", onPress: () => goStep("publish") }
        : { label: "Back", onPress: () => goStep(spine[spine.length - 1]!.key) };

  const next = role === "publish" ? null : { label: advance.label, onPress: pressNext };

  return (
    // The class height is only the guess for the server-rendered paint; the
    // effect above measures the real room and overrides it before first paint.
    <div
      ref={rootRef}
      data-compose-root
      className="flex h-[calc(var(--app-h)-var(--nav-h))] min-h-0 flex-col overflow-hidden"
    >
      {/* The header is one block in the flow: the bar, then the tracker.
          Nothing sticks. The columns under it scroll, so it never has to. */}
      <div className="shrink-0 bg-paper">
        <ComposeHeader crumb={typeDef.label}>
          {railUseful ? (
            <RailOpenButton onClick={() => setRailDrawerOpen(true)} cardCount={cards.length} />
          ) : null}
          {error && !dirty ? (
            <span className="t-meta max-w-[14rem] truncate text-[11px] text-[var(--down)]" role="alert">
              {error}
            </span>
          ) : null}
          {editingPublished ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
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
            // The draft's state, where the design puts it. On a phone it
            // sits beside the forward button instead, where there is room.
            <span className="hidden md:inline">
              <span className="num mr-2 text-[10px] uppercase tracking-[0.16em] text-text-faint">
                Draft ·
              </span>
              <span className="inline-block align-middle">
                <SaveStatus
                  dirty={dirty}
                  saving={saveStatus === "saving" || savingDraft}
                  savedAt={savedAt}
                  error={saveError}
                />
              </span>
            </span>
          )}
        </ComposeHeader>

        <StepNav
          steps={spine}
          current={role === "spine" ? stepKey : null}
          stateOf={(k) => stepState(k, stepFacts)}
          reachable={(k) => firstPassDone || visited.has(k)}
          onGo={goStep}
        />
      </div>

      {/* LEFT is what you build with; the spine is what you publish as. */}
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

        {/* Canvas: one screen at a time. Compose is a working surface, not
            an article, so the canvas takes the standard page width; only the
            prose keeps a measure, and that is set on the writer. */}
        <div
          ref={canvasRef}
          className="scroll-area min-h-0 min-w-0 flex-1 overflow-y-auto pb-[var(--tab-h)]"
        >
          <div
            className={cn(
              "mx-auto w-full px-4 py-6 md:px-8 md:py-10",
              stepKey === "thesis" ? "max-w-[60rem]" : "max-w-[var(--w-standard)]",
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
                  You can change the headline, the standfirst, the text, the cards and
                  the tags. Saving records an EDITED marker on the publication showing what
                  changed and when, which readers can open.
                </p>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-text-mute">
                  {hasLockedCall
                    ? "The call and its entry price cannot change, and neither can its resolution. Those are the record."
                    : "The type, the pricing and the access setting cannot change."}
                </p>
              </div>
            ) : null}

            <StepFrame
              eyebrow={eyebrow}
              title={current.label}
              blurb={
                editingPublished && stepKey === "video"
                  ? "The clip and what is placed on it are the record. They open here to be read."
                  : current.blurb
              }
              back={back}
              next={next}
              note={note}
              status={
                <span className="md:hidden">
                  <SaveStatus
                    dirty={dirty}
                    saving={saveStatus === "saving" || savingDraft}
                    savedAt={savedAt}
                    error={saveError}
                  />
                </span>
              }
            >
              {/* Each screen's content sits inside its own boundary, so a
                  screen that fails to draw is redrawn on its own while the
                  workspace above it, and everything it holds, stays put. */}

              {/* THE WRITER. Always mounted on every type that has one,
                  hidden off-screen: the Tiptap instance holds the charts the
                  publish path screenshots, and losing it on a screen change
                  would lose them. Prose is the one thing on the canvas that
                  wants a measure, so the column is capped here and nowhere
                  else. */}
              {hasWriter ? (
                <StepErrorBoundary
                  label="The report"
                  onReset={() => setEditorSeed(latestChangeRef.current.json)}
                >
                  <DevCrash step="thesis" />
                  <div className={cn(stepKey !== "thesis" && "hidden")}>
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
                        initialContent={editorSeed}
                        onChange={onEditorChange}
                        reportTicker={hasCard ? ticker || undefined : undefined}
                        onReady={(e) => {
                          editorRef.current = e;
                          setEditor(e);
                        }}
                      />
                    </div>
                  </div>
                </StepErrorBoundary>
              ) : null}

              {/* THE TAKE. A brief is its text and nothing else. */}
              {stepKey === "brief" ? (
                <StepErrorBoundary label="The take">
                  <DevCrash step="brief" />
                  <div className="max-w-[60rem]">
                    <label htmlFor="brief-text" className="sr-only">
                      The take
                    </label>
                    <textarea
                      id="brief-text"
                      value={summary}
                      maxLength={BRIEF_MAX_CHARS}
                      onChange={(e) => {
                        setSummary(e.target.value.slice(0, BRIEF_MAX_CHARS));
                        markDirty();
                      }}
                      placeholder="Say the one thing."
                      rows={6}
                      dir="auto"
                      autoFocus={!editingPublished}
                      className="user-copy w-full resize-none rounded-[var(--radius-card)] border border-border bg-surface p-4 text-[1.125rem] leading-relaxed text-text placeholder:text-text-faint focus:outline-none focus-visible:border-[var(--ink)]"
                    />
                    <p className="num mt-2 text-[11px] uppercase tracking-[0.12em] text-text-faint">
                      {summary.trim().length} / {BRIEF_MAX_CHARS}
                    </p>
                  </div>
                </StepErrorBoundary>
              ) : null}

              {/* THE HEADLINE. One line that travels, and where it travels to. */}
              {stepKey === "headline" ? (
                <StepErrorBoundary label="Headline">
                  <DevCrash step="headline" />
                  <div className="max-w-[60rem]">
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
                        markDirty();
                        fitTextarea(e.currentTarget);
                      }}
                      ref={titleAreaRef}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (isBrief) pressNext();
                          else document.getElementById("report-summary")?.focus();
                        }
                      }}
                      placeholder="Headline"
                      dir="auto"
                      autoFocus={!editingPublished}
                      className="user-copy mb-2 min-h-[2.75rem] w-full resize-none overflow-hidden bg-transparent text-3xl font-semibold leading-tight tracking-tight text-text placeholder:text-text-mute focus:outline-none md:min-h-[3.25rem] md:text-4xl"
                      style={{ fontFamily: "var(--font-display)" }}
                    />
                    {isBrief ? null : (
                      <>
                        <label htmlFor="report-summary" className="sr-only">
                          Dek
                        </label>
                        <input
                          id="report-summary"
                          value={summary}
                          onChange={(e) => {
                            setSummary(e.target.value);
                            markDirty();
                          }}
                          placeholder="One line under the headline. Optional."
                          dir="auto"
                          className="user-copy mb-5 w-full bg-transparent text-lg text-text-mute placeholder:text-text-faint focus:outline-none"
                        />
                      </>
                    )}
                    <HeadlineTravels title={title} dek={isBrief ? "" : summary} typeLabel={typeDef.label} ticker={ticker} />
                  </div>
                </StepErrorBoundary>
              ) : null}

              {/* THE CALL. The verdict's spine, or a feature on the others. */}
              {stepKey === "call" && isVerdict ? (
                <StepErrorBoundary label="The call">
                <DevCrash step="call" />
                <VerdictCallPanel
                  ticker={ticker}
                  onTicker={dirtying(setTicker)}
                  lookup={symbolLookup}
                  onRetryLookup={retrySymbolLookup}
                  eligibility={eligibility}
                  direction={direction}
                  onDirection={dirtying(setDirection)}
                  target={target}
                  onTarget={dirtying(setTarget)}
                  horizon={horizon}
                  onHorizon={dirtying(setHorizon)}
                  window={vWindow}
                  frozen={editingPublished}
                />
                {callDraftNote ? (
                  <p className="mt-3 text-[0.8125rem] leading-snug text-[var(--brass)]" role="status">
                    {callDraftNote}
                  </p>
                ) : null}
                </StepErrorBoundary>
              ) : null}
              {stepKey === "call" && !isVerdict ? (
                <StepErrorBoundary label="The call">
                <DevCrash step="call" />
                <LockPublishPanel
                  sections="call"
                  hasCard={hasCard}
                  ticker={ticker}
                  onTicker={dirtying(setTicker)}
                  lookup={symbolLookup}
                  onRetryLookup={retrySymbolLookup}
                  frozen={editingPublished}
                  direction={direction}
                  onDirection={dirtying(setDirection)}
                  target={target}
                  onTarget={dirtying(setTarget)}
                  horizon={horizon}
                  onHorizon={dirtying(setHorizon)}
                  access={access}
                  onAccess={dirtying(setAccess)}
                  price={price}
                  onPrice={dirtying(setPrice)}
                  membersIncluded={membersIncluded}
                  onMembersIncluded={dirtying(setMembersIncluded)}
                  minPlanRank={minPlanRank}
                  onMinPlanRank={dirtying(setMinPlanRank)}
                  requiredPerks={requiredPerks}
                  onRequiredPerks={dirtying(setRequiredPerks)}
                  plans={plans}
                  disclosure={disclosure}
                  onDisclosure={setDisclosure}
                  publishLabel=""
                  publishDisabledReason={null}
                  onPublish={() => {}}
                  pending={false}
                  error={null}
                />
                {callDraftNote ? (
                  <p className="mt-3 text-[0.8125rem] leading-snug text-[var(--brass)]" role="status">
                    {callDraftNote}
                  </p>
                ) : null}
                </StepErrorBoundary>
              ) : null}

              {/* CARDS. An invitation, not a hurdle: what a card is, what it
                  does for the reader, and one obvious way to make one. */}
              {stepKey === "cards" ? (
                <StepErrorBoundary label="Cards">
                <DevCrash step="cards" />
                <div>
                  {cards.length === 0 ? (
                    <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface p-5">
                      <p className="text-[0.9375rem] leading-relaxed text-text">
                        A card is the claim on its own: the thesis in two lines, where your
                        numbers differ from the street, the arithmetic that gets you to the
                        target, or what would prove you wrong.
                      </p>
                      <p className="mt-2 text-[0.875rem] leading-relaxed text-text-mute">
                        Readers see cards first, in the Feed and above the text, and they
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
                        {hasWriter ? (
                          <button
                            type="button"
                            onClick={() => runAssistant(ASSISTANT_ACTIONS[0]!)}
                            className="focus-ring rounded-[var(--radius-btn)] border border-border px-4 py-2 text-[0.8125rem] text-text-mute transition-colors hover:border-[var(--ink)] hover:text-text"
                          >
                            Draft them from what I have written
                          </button>
                        ) : null}
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
                        Click a card to open it again. Drag a card from the toolbox into your
                        text to place it there, or onto the timeline to make it appear in the
                        video.
                      </p>
                    </div>
                  )}
                </div>
                </StepErrorBoundary>
              ) : null}

              {/* VIDEO. Mounted on every type that may carry a clip and hidden
                  off-screen, so the loaded clip and its object URL survive a
                  move to another screen and back. */}
              {pubType === "video" || pubType === "verdict" ? (
                <StepErrorBoundary label="Video">
                <DevCrash step="video" />
                <div className={cn(stepKey !== "video" && "hidden")}>
                  {clipSeconds > 0 && feedPreviewSeconds ? (
                    <p className="mb-4 text-[0.8125rem] leading-snug text-text-mute">
                      This clip is longer than the Feed budget. The Feed will play the first{" "}
                      {feedPreviewSeconds} seconds. The full video stays on Explore and your
                      profile.
                    </p>
                  ) : clipSeconds > 0 && pubType === "video" ? (
                    <p className="mb-4 text-[0.8125rem] leading-snug text-text-mute">
                      This clip fits the Feed. Readers will see the whole thing there.
                    </p>
                  ) : null}
                  <VideoRung
                    initialSrc={clipUrl}
                    stage="all"
                    value={videoEdit ?? undefined}
                    onChange={dirtying(setVideoEdit)}
                    onFile={(file, durationSeconds) => {
                      videoFileRef.current = { file, durationSeconds };
                      setClipUrl(URL.createObjectURL(file));
                      setVideoChosen(true);
                    }}
                    hasClip={videoChosen}
                    onRemove={editingPublished ? undefined : removeVideo}
                    frozen={editingPublished}
                    cards={deck}
                    chrome={false}
                    ticker={ticker.trim() || undefined}
                  />
                </div>
                </StepErrorBoundary>
              ) : null}

              {/* TAGS. */}
              {stepKey === "tags" ? (
                <StepErrorBoundary label="Tags">
                <DevCrash step="tags" />
                <div className="flex max-w-[60rem] flex-col gap-4">
                  <TagPicker
                    value={tags}
                    onChange={dirtying(setTags)}
                    popular={popularTags}
                    hasCall={lockingCall}
                    callSector={
                      lockingCall
                        ? (UNIVERSE.find((u) => u.ticker === ticker.trim().toUpperCase())?.sector ??
                          null)
                        : null
                    }
                  />
                </div>
                </StepErrorBoundary>
              ) : null}

              {/* PUBLISH. */}
              {stepKey === "publish" ? (
                <StepErrorBoundary label="Publish">
                <DevCrash step="publish" />
                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="focus-ring w-full rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2 text-left text-[0.8125rem] text-text hover:border-[var(--ink)]"
                  >
                    Preview publication
                  </button>
                  {hasWriter && plainText.trim() ? (
                    <FactCheckerPanel
                      text={plainText}
                      credits={credits}
                      initialResult={factCheck}
                      onCreditsChange={setCredits}
                      onResult={setFactCheck}
                    />
                  ) : null}
                  <FeaturesMenu typeNoun={typeDef.key} rows={featureRows} onOpen={goStep} />
                  <CompanionPicker
                    currentId={draftId}
                    type={pubType}
                    value={linkedReportId}
                    onChange={setLinkedReportId}
                  />
                  <LockPublishPanel
                    sections="publish"
                    hasCard={hasCard}
                    ticker={ticker}
                    onTicker={dirtying(setTicker)}
                    direction={direction}
                    onDirection={dirtying(setDirection)}
                    target={target}
                    onTarget={dirtying(setTarget)}
                    horizon={horizon}
                    onHorizon={dirtying(setHorizon)}
                    access={access}
                    onAccess={dirtying(setAccess)}
                    price={price}
                    onPrice={dirtying(setPrice)}
                    membersIncluded={membersIncluded}
                    onMembersIncluded={dirtying(setMembersIncluded)}
                    minPlanRank={minPlanRank}
                    onMinPlanRank={dirtying(setMinPlanRank)}
                    requiredPerks={requiredPerks}
                    onRequiredPerks={dirtying(setRequiredPerks)}
                    plans={plans}
                    disclosure={disclosure}
                    onDisclosure={setDisclosure}
                    publishLabel={isVerdict ? "Publish the verdict" : lockingCall ? "Publish & Lock" : "Publish"}
                    publishDisabledReason={publishBlockedBy}
                    onPublish={onPublishClick}
                    pending={pending}
                    error={error}
                    promote={<PromotePanel state={promote} onChange={setPromote} />}
                    visibility={isVerdict ? <VerdictVisibility /> : undefined}
                  />
                </div>
                </StepErrorBoundary>
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
        // Done means "finished for now", so on a draft it also saves, the
        // same save the header button makes. On a live publication saving is
        // a disclosed act the creator does on purpose, so Done only closes
        // and says where the save is.
        onDone={() => {
          setSelectedCardId(null);
          if (!editingPublished) startDraft(() => persistDraft());
        }}
        doneNote={
          editingPublished
            ? "Kept, and still editable. Press Save changes above to record the edit."
            : "Saved with the draft. Reopen it from the toolbox or the Cards screen any time."
        }
      />

      <PublishPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        dek={isBrief ? "" : summary}
        cards={cards}
        clipSeconds={videoChosen ? clipSeconds : null}
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

      <LeaveDialog
        href={leaveTo}
        published={editingPublished}
        saving={saveStatus === "saving" || savingDraft}
        onStay={() => setLeaveTo(null)}
        onLeave={() => {
          if (!leaveTo) return;
          dirtyRef.current = false;
          setDirty(false);
          router.push(leaveTo);
        }}
        onSaveAndLeave={() => {
          if (!leaveTo) return;
          startDraft(async () => {
            if (editingPublished) await persistEdit();
            else await persistDraft();
            if (dirtyRef.current) return;
            router.push(leaveTo);
          });
        }}
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

/**
 * Where the headline goes once it leaves this screen: a Today row, a
 * subscriber's inbox, a pasted link. Shown under the field so the creator
 * writes for the places it will be read rather than for the field.
 */
function HeadlineTravels({
  title,
  dek,
  typeLabel,
  ticker,
}: {
  title: string;
  dek: string;
  typeLabel: string;
  ticker: string;
}) {
  const line = title.trim() || "Your headline";
  const empty = !title.trim();
  const kicker = [ticker.trim().toUpperCase() || null, typeLabel.toUpperCase()].filter(Boolean).join(" · ");
  return (
    <div className="mt-6 grid gap-3 border-t border-border pt-5 md:grid-cols-3">
      <p className="num text-[10px] uppercase tracking-[0.16em] text-text-faint md:col-span-3">
        How the line travels
      </p>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5">
        <p className="num text-[9px] uppercase tracking-[0.14em] text-text-faint">Today</p>
        <p className="num mt-2 text-[10px] uppercase tracking-[0.14em] text-text-mute">{kicker}</p>
        <p className={cn("user-copy mt-1 font-display text-[1.0625rem] font-semibold leading-snug", empty ? "text-text-faint" : "text-text")}>
          {line}
        </p>
        {dek.trim() ? <p className="mt-1 text-[0.8125rem] leading-snug text-text-mute">{dek}</p> : null}
      </div>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5">
        <p className="num text-[9px] uppercase tracking-[0.14em] text-text-faint">Inbox</p>
        <p className={cn("user-copy mt-2 truncate text-[0.9375rem] font-medium", empty ? "text-text-faint" : "text-text")}>
          {line}
        </p>
        <p className="mt-1 truncate text-[0.8125rem] text-text-mute">
          {dek.trim() || `A new ${typeLabel.toLowerCase()} from you.`}
        </p>
      </div>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5">
        <p className="num text-[9px] uppercase tracking-[0.14em] text-text-faint">Pasted link</p>
        <div className="mt-2 rounded-[var(--radius-btn)] border border-border bg-bg p-2.5">
          <p className="num text-[9px] uppercase tracking-[0.14em] text-text-faint">stoamarket.ai</p>
          <p className={cn("user-copy mt-1 line-clamp-2 text-[0.875rem] font-medium leading-snug", empty ? "text-text-faint" : "text-text")}>
            {line}
          </p>
        </div>
      </div>
    </div>
  );
}
