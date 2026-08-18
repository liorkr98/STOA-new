import type { Prediction, Profile, Report } from "@/lib/types";

export interface DispatchCycle {
  issueNumber: number;
  /** ISO date string for the dispatch dateline (America/New_York calendar day). */
  date: string;
  cycleStart: string;
  cycleEnd: string;
  /** True when content is from a prior cycle due to low volume. */
  fallbackCycle: boolean;
}

export interface DispatchStory {
  report: Report;
  author: Profile;
  prediction: Prediction | null;
  headline: string;
  dek: string | null;
}

export interface DispatchLedgerRow {
  ticker: string;
  authorHandle: string;
  authorName: string;
  targetPrice: number | null;
  resolvedPrice: number | null;
  /** Signed return in percent, direction-aware (prediction.return_pct). */
  returnPct: number | null;
  outcome: "hit" | "near" | "partial" | "miss";
  resolvedAt: string;
  reportId: string;
}

export interface DispatchPayload {
  cycle: DispatchCycle;
  readMinutes: number;
  personalized: boolean;
  /** How many analysts feed this dispatch (followed + subscribed), when personalized. */
  followedCount: number;
  lead: DispatchStory | null;
  /** Featured stories after the lead: two-column editorial treatment with deks. */
  secondary: DispatchStory[];
  /** Dense one-line stories after the featured block. */
  wire: DispatchStory[];
  resolved: DispatchLedgerRow[];
}

export type DispatchViewMode = "public" | "home";
