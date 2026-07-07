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
  outcome: "hit" | "near" | "partial" | "miss";
  resolvedAt: string;
  reportId: string;
}

export interface DispatchLeaderboardEntry {
  analyst: Profile;
  resolvedCalls: number;
}

export interface DispatchPayload {
  cycle: DispatchCycle;
  readMinutes: number;
  personalized: boolean;
  lead: DispatchStory | null;
  secondary: DispatchStory[];
  resolved: DispatchLedgerRow[];
  leaderboard: DispatchLeaderboardEntry[];
}

export type DispatchViewMode = "public" | "home";
