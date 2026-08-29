import { z } from "zod";

/**
 * Zod schemas for evidence-card payloads, mirroring the FeedCard union in
 * ./types.ts. Validation happens at the write boundary so the reader can trust
 * the stored jsonb: a payload that does not match its `kind` never lands, which
 * is what lets the read path map rows straight to the player's shape.
 *
 * `id`, `kind` and `locked` are columns, not payload, so they are absent here.
 */

const inkValue = z.object({
  text: z.string().max(400),
  ink: z.enum(["plain", "creator_est", "auto"]),
});

export const CARD_PAYLOADS = {
  thesis: z.object({
    title: z.string().max(300),
    body: z.string().max(4000),
  }),
  edge: z.object({
    street: z.array(inkValue).max(8),
    mine: z.array(inkValue).max(8),
  }),
  path_to_target: z.object({
    steps: z.array(z.object({ label: z.string().max(200), value: inkValue })).max(10),
    result: inkValue,
  }),
  kill_switch: z.object({
    conditions: z.array(inkValue).max(10),
  }),
  catalyst_timeline: z.object({
    events: z
      .array(
        z.object({
          dateISO: z.string().max(40),
          label: z.string().max(200),
          past: z.boolean(),
        }),
      )
      .max(12),
  }),
  checklist: z.object({
    rows: z
      .array(
        z.object({
          label: z.string().max(200),
          status: z.enum(["done", "pending", "failed"]),
          ink: z.enum(["plain", "creator_est", "auto"]),
        }),
      )
      .max(12),
  }),
  figure: z.object({
    caption: z.string().max(400),
    imageUrl: z.string().url().nullable(),
    source: z.enum(["creator", "auto"]),
  }),
  chart: z.object({
    ticker: z.string().max(16),
    caption: z.string().max(400),
    compareTicker: z.string().max(16).optional(),
    engine: z.enum(["yahoo", "tradingview"]).optional(),
  }),
  steelman: z.object({
    objection: z.string().max(2000),
    answer: z.string().max(2000),
  }),
  // Access and price are read from the report at build time, never stored.
  unlock: z.object({}).passthrough(),
} as const;

export type CardKind = keyof typeof CARD_PAYLOADS;

export const CARD_KINDS = Object.keys(CARD_PAYLOADS) as CardKind[];

export function isCardKind(value: unknown): value is CardKind {
  return typeof value === "string" && (CARD_KINDS as string[]).includes(value);
}

export interface ValidatedCard {
  kind: CardKind;
  locked: boolean;
  payload: Record<string, unknown>;
}

export class CardValidationError extends Error {}

/** Max cards in one stack, matching the nine formats the player renders. */
export const MAX_CARDS_PER_PUBLICATION = 12;

/** Validate a client-supplied stack. Throws CardValidationError on the first bad card. */
export function validateCards(input: unknown): ValidatedCard[] {
  if (!Array.isArray(input)) throw new CardValidationError("cards must be an array");
  if (input.length > MAX_CARDS_PER_PUBLICATION) {
    throw new CardValidationError(`at most ${MAX_CARDS_PER_PUBLICATION} cards`);
  }

  return input.map((raw, i) => {
    if (typeof raw !== "object" || raw === null) {
      throw new CardValidationError(`card ${i}: not an object`);
    }
    const obj = raw as Record<string, unknown>;
    if (!isCardKind(obj.kind)) {
      throw new CardValidationError(`card ${i}: unknown kind ${String(obj.kind)}`);
    }
    const kind = obj.kind;
    const parsed = CARD_PAYLOADS[kind].safeParse(obj.payload ?? {});
    if (!parsed.success) {
      throw new CardValidationError(`card ${i} (${kind}): ${parsed.error.issues[0]?.message ?? "invalid payload"}`);
    }
    return {
      kind,
      // The unlock card is never gated; it is the thing that sells the rest.
      locked: kind === "unlock" ? false : obj.locked === true,
      payload: parsed.data as Record<string, unknown>,
    };
  });
}
