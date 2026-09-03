import type { CardKind } from "@/lib/feed/card-schema";
import type { InkValue, ProvenanceInk } from "@/lib/feed/types";

/**
 * The shared card model for Compose.
 *
 * Cards are not part of the video and not part of the research: they are one
 * pool the publication draws on, and the same card may appear in both. So the
 * deck lives here rather than inside either module, and a card carries where
 * it is currently used instead of being owned by whichever surface made it.
 *
 * `kind`, `locked` and `payload` are exactly what `publication_cards` stores
 * (validated by `validateCards`); `id` is a client id that survives a save so
 * placements keep pointing at the right card. Nothing here needs a migration.
 */

export interface DraftCard {
  id: string;
  kind: CardKind;
  locked: boolean;
  payload: Record<string, unknown>;
}

/** Where a card is currently placed. A card can be in both at once. */
export interface CardUsage {
  inVideo: boolean;
  inResearch: boolean;
}

export const newCardId = () => `c_${Math.random().toString(36).slice(2, 10)}`;

/* ------------------------------------------------------------------ intents */

/**
 * The library is organised by what the creator is trying to do, because that
 * is the question they can answer ("I want to show the risk"). The shape they
 * would rather pick ("I want a timeline") is the Custom entry below, and both
 * routes build the same nine formats.
 */
export interface CardKindSpec {
  kind: CardKind;
  label: string;
  blurb: string;
  /** The format, for the shape-based route. */
  shape: string;
}

export interface CardIntent {
  key: string;
  label: string;
  kinds: CardKindSpec[];
}

export const CARD_INTENTS: CardIntent[] = [
  {
    key: "case",
    label: "Make your case",
    kinds: [
      { kind: "thesis", label: "Thesis", blurb: "The claim, in one paragraph.", shape: "Statement" },
    ],
  },
  {
    key: "prove",
    label: "Prove it",
    kinds: [
      { kind: "path_to_target", label: "Path to target", blurb: "The steps that get you to the number.", shape: "Steps" },
      { kind: "checklist", label: "Checklist", blurb: "What you checked, and what it said.", shape: "Checklist" },
    ],
  },
  {
    key: "compare",
    label: "Compare",
    kinds: [
      { kind: "edge", label: "Your edge", blurb: "What the street says beside what you say.", shape: "Two columns" },
    ],
  },
  {
    key: "risk",
    label: "Show the risk",
    kinds: [
      { kind: "kill_switch", label: "Kill switch", blurb: "What would prove you wrong.", shape: "Conditions" },
      { kind: "steelman", label: "Steelman", blurb: "The best case against you, answered.", shape: "Objection and answer" },
      { kind: "catalyst_timeline", label: "Catalysts", blurb: "The dates that decide it.", shape: "Timeline" },
    ],
  },
  {
    key: "own",
    label: "Your own",
    kinds: [
      { kind: "figure", label: "Figure", blurb: "A still image of your own.", shape: "Image" },
      { kind: "chart", label: "Chart", blurb: "Live tape for the ticker you enter.", shape: "Chart" },
    ],
  },
];

/** Every buildable kind, flattened. The unlock card is excluded: it is pinned, not chosen. */
export const LIBRARY_KINDS: CardKindSpec[] = CARD_INTENTS.flatMap((i) => i.kinds);

export function kindSpec(kind: CardKind): CardKindSpec | undefined {
  return LIBRARY_KINDS.find((k) => k.kind === kind);
}

/* ------------------------------------------------------------------ blanks */

/** A new card of this kind, empty but already valid against its schema. */
export function blankCard(kind: CardKind): DraftCard {
  const id = newCardId();
  switch (kind) {
    case "thesis":
      return { id, kind, locked: false, payload: { title: "", body: "" } };
    case "edge":
      return { id, kind, locked: false, payload: { street: [], mine: [] } };
    case "path_to_target":
      return { id, kind, locked: false, payload: { steps: [], result: { text: "", ink: "creator_est" } } };
    case "kill_switch":
      return { id, kind, locked: false, payload: { conditions: [] } };
    case "catalyst_timeline":
      return { id, kind, locked: false, payload: { events: [] } };
    case "checklist":
      return { id, kind, locked: false, payload: { rows: [] } };
    case "figure":
      return { id, kind, locked: false, payload: { caption: "", imageUrl: null, source: "creator" } };
    case "chart":
      return { id, kind, locked: false, payload: { ticker: "", caption: "", compareTicker: "" } };
    case "steelman":
      return { id, kind, locked: false, payload: { objection: "", answer: "" } };
    case "unlock":
      return { id, kind, locked: false, payload: {} };
  }
}

/* ------------------------------------------------- names, summaries, ink */

const KIND_LABEL: Record<CardKind, string> = {
  thesis: "Thesis",
  edge: "Your edge",
  path_to_target: "Path to target",
  kill_switch: "Kill switch",
  catalyst_timeline: "Catalysts",
  checklist: "Checklist",
  figure: "Figure",
  chart: "Chart",
  steelman: "Steelman",
  unlock: "Unlock",
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function inkList(v: unknown): InkValue[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as InkValue[]) : [];
}

/**
 * The tray shows a name, so a card the creator has filled in is named by its
 * own words and a blank one falls back to its format. Derived rather than
 * stored: the payload is the only thing `publication_cards` keeps, and a
 * separate name column would drift out of step with the words on the card.
 */
export function cardName(card: DraftCard): string {
  const p = card.payload;
  switch (card.kind) {
    case "thesis":
      return str(p.title).trim() || KIND_LABEL.thesis;
    case "figure":
      return str(p.caption).trim() || KIND_LABEL.figure;
    case "chart":
      return str(p.ticker).trim().toUpperCase() || KIND_LABEL.chart;
    case "steelman":
      return str(p.objection).trim().slice(0, 60) || KIND_LABEL.steelman;
    default:
      return KIND_LABEL[card.kind];
  }
}

/** One line under the name: enough to tell two cards of the same kind apart. */
export function cardSummary(card: DraftCard): string {
  const p = card.payload;
  switch (card.kind) {
    case "thesis": {
      const body = str(p.body).trim();
      return body ? body.slice(0, 90) : "No claim written yet";
    }
    case "edge": {
      const street = inkList(p.street).length;
      const mine = inkList(p.mine).length;
      return street + mine === 0 ? "Nothing compared yet" : `${street} street · ${mine} yours`;
    }
    case "path_to_target": {
      const steps = Array.isArray(p.steps) ? p.steps.length : 0;
      const result = (p.result as InkValue | undefined)?.text ?? "";
      return steps === 0 ? "No steps yet" : `${steps} step${steps === 1 ? "" : "s"}${result ? ` → ${result}` : ""}`;
    }
    case "kill_switch": {
      const n = inkList(p.conditions).length;
      return n === 0 ? "No conditions yet" : `${n} condition${n === 1 ? "" : "s"}`;
    }
    case "catalyst_timeline": {
      const n = Array.isArray(p.events) ? p.events.length : 0;
      return n === 0 ? "No dates yet" : `${n} dated event${n === 1 ? "" : "s"}`;
    }
    case "checklist": {
      const n = Array.isArray(p.rows) ? p.rows.length : 0;
      return n === 0 ? "Nothing checked yet" : `${n} check${n === 1 ? "" : "s"}`;
    }
    case "figure":
      return p.imageUrl ? "Image attached" : "No image yet";
    case "chart": {
      const t = str(p.ticker).trim().toUpperCase();
      const cmp = str(p.compareTicker).trim().toUpperCase();
      if (!t) return "No ticker yet";
      return cmp ? `${t} · ${cmp}` : t;
    }
    case "steelman": {
      const answer = str(p.answer).trim();
      return answer ? answer.slice(0, 90) : "Not answered yet";
    }
    case "unlock":
      return "Pinned last · what the reader buys";
  }
}

/**
 * True when nothing has been written on the card: it is still the blank it
 * was made as. The cards step will not carry one of these forward, because a
 * blank card in the Feed is a claim with nothing on it.
 */
export function cardIsEmpty(card: DraftCard): boolean {
  const p = card.payload;
  switch (card.kind) {
    case "thesis":
      return !str(p.title).trim() && !str(p.body).trim();
    case "edge":
      return inkList(p.street).length + inkList(p.mine).length === 0;
    case "path_to_target":
      return (
        !(Array.isArray(p.steps) && p.steps.length > 0) &&
        !((p.result as InkValue | undefined)?.text ?? "").trim()
      );
    case "kill_switch":
      return inkList(p.conditions).length === 0;
    case "catalyst_timeline":
      return !(Array.isArray(p.events) && p.events.length > 0);
    case "checklist":
      return !(Array.isArray(p.rows) && p.rows.length > 0);
    case "figure":
      return !p.imageUrl && !str(p.caption).trim();
    case "chart":
      return !str(p.ticker).trim();
    case "steelman":
      return !str(p.objection).trim() && !str(p.answer).trim();
    case "unlock":
      return false;
  }
}

/**
 * The card's provenance tag. A card can mix inks, so the tag names the
 * strongest claim on it: an imported market fact outranks the creator's own
 * number, which outranks their plain view. Matches the three-ink system the
 * player renders per value.
 */
export function cardInk(card: DraftCard): ProvenanceInk {
  const p = card.payload;
  const inks: ProvenanceInk[] = [];
  const push = (v: unknown) => {
    const ink = (v as InkValue | undefined)?.ink;
    if (ink) inks.push(ink);
  };

  switch (card.kind) {
    case "edge":
      [...inkList(p.street), ...inkList(p.mine)].forEach(push);
      break;
    case "path_to_target":
      (Array.isArray(p.steps) ? p.steps : []).forEach((s) => push((s as { value?: InkValue }).value));
      push(p.result);
      break;
    case "kill_switch":
      inkList(p.conditions).forEach(push);
      break;
    case "checklist":
      (Array.isArray(p.rows) ? p.rows : []).forEach((r) => {
        const ink = (r as { ink?: ProvenanceInk }).ink;
        if (ink) inks.push(ink);
      });
      break;
    case "figure":
      if (p.source === "auto") inks.push("auto");
      break;
    case "chart":
      inks.push("auto");
      break;
    default:
      break;
  }

  if (inks.includes("auto")) return "auto";
  if (inks.includes("creator_est")) return "creator_est";
  return "plain";
}

/** Filled sample used in the library preview before a card is added. */
export function sampleCard(kind: CardKind): DraftCard {
  const id = `preview_${kind}`;
  switch (kind) {
    case "thesis":
      return { id, kind, locked: false, payload: { title: "The claim", body: "Margins expand as mix shifts to software. Street still prices a hardware cycle." } };
    case "edge":
      return {
        id,
        kind,
        locked: false,
        payload: {
          street: [{ text: "Street: 22x forward", ink: "auto" }],
          mine: [{ text: "I use 18x on mix-adjusted EBIT", ink: "creator_est" }],
        },
      };
    case "path_to_target":
      return {
        id,
        kind,
        locked: false,
        payload: {
          steps: [{ label: "Gross margin", value: { text: "+180 bps", ink: "creator_est" } }],
          result: { text: "$142", ink: "creator_est" },
        },
      };
    case "kill_switch":
      return { id, kind, locked: false, payload: { conditions: [{ text: "Gross margin stalls two quarters", ink: "plain" }] } };
    case "catalyst_timeline":
      return { id, kind, locked: false, payload: { events: [{ dateISO: "2026-09", label: "Next print", past: false }] } };
    case "checklist":
      return { id, kind, locked: false, payload: { rows: [{ label: "Filings match the mix story", status: "done", ink: "plain" }] } };
    case "figure":
      return { id, kind, locked: false, payload: { caption: "Your chart or still", imageUrl: null, source: "creator" } };
    case "chart":
      return { id, kind, locked: false, payload: { ticker: "NVDA", caption: "Last 90 sessions", compareTicker: "" } };
    case "steelman":
      return { id, kind, locked: false, payload: { objection: "The multiple already prices the mix shift.", answer: "Only if software stays at 18% of revenue." } };
    case "unlock":
      return { id, kind, locked: false, payload: {} };
  }
}

/* ------------------------------------------------------------------- deck */

export function orderedDeck(cards: DraftCard[]): DraftCard[] {
  const body = cards.filter((c) => c.kind !== "unlock");
  const cta = cards.filter((c) => c.kind === "unlock");
  return [...body, ...cta];
}

/** The shape `saveCards` validates. */
export function toStoredCards(cards: DraftCard[]): { kind: CardKind; locked: boolean; payload: Record<string, unknown> }[] {
  return orderedDeck(cards).map((c) => ({ kind: c.kind, locked: c.locked, payload: c.payload }));
}

/** Move a card within the deck, keeping the pinned CTA last. */
export function moveCard(cards: DraftCard[], from: number, to: number): DraftCard[] {
  const next = [...cards];
  const [moved] = next.splice(from, 1);
  if (!moved) return cards;
  next.splice(to, 0, moved);
  return orderedDeck(next);
}
