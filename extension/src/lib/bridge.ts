import type { Direction, StoaSession, WeekRow } from "@/lib/types";

/**
 * Messages from a Stoa page. Mirrors src/lib/extension/bridge-protocol.ts in
 * the app; keep the two in step.
 */
export type BridgeTap = {
  id: string;
  ticker: string;
  direction: Direction;
  videoId: string | null;
  videoChannel: string | null;
  videoSeconds: number | null;
  createdAt: string;
};

export type BridgeRequest =
  | { type: "stoa:hello" }
  | { type: "stoa:session"; session: StoaSession }
  | { type: "stoa:pull"; userId: string }
  | { type: "stoa:ack"; userId: string; delivered: string[]; undone: string[]; week: { weekStart: string; rows: WeekRow[] } };

import { STOA } from "@/lib/messages";

/**
 * The pages allowed to talk to the extension: the Stoa this build talks to
 * (the manifest's externally_connectable says the same in wxt.config.ts).
 */
export const STOA_PAGES = STOA.includes("stoamarket.ai") ? ["https://www.stoamarket.ai", "https://stoamarket.ai"] : [STOA];
