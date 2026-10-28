import type { CartDirection } from "@/lib/interest-cart/types";

/**
 * Messages between a Stoa page and the Stoa extension (externally_connectable:
 * only stoamarket.ai and localhost:3000 can send them, and only to the
 * extension's id). The extension keeps a copy of these types
 * (extension/src/lib/bridge.ts); keep the two in step.
 */
export type ExtensionSessionPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string | null;
};

/** A tap Stoa's API accepted for this reader, waiting in the extension for the site. */
export type BridgeTap = {
  id: string;
  ticker: string;
  direction: CartDirection;
  videoId: string | null;
  videoChannel: string | null;
  videoSeconds: number | null;
  /** The video's title at the tap; absent from taps made before titles were kept. */
  videoTitle?: string | null;
  createdAt: string;
};

export type BridgeRequest =
  | { type: "stoa:hello" }
  | { type: "stoa:session"; session: ExtensionSessionPayload }
  | { type: "stoa:pull"; userId: string }
  | {
      type: "stoa:ack";
      userId: string;
      delivered: string[];
      undone: string[];
      week: { weekStart: string; rows: { ticker: string; bull: number; bear: number }[] };
    };

export type HelloReply = { version: string; userId: string | null };
export type PullReply = { taps: BridgeTap[]; undos: { id: string; ticker: string }[] };
