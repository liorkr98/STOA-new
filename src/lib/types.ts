/**
 * Domain types shared across the engine, the data layer, and the UI.
 * These mirror the Postgres schema in supabase/migrations.
 */

import type { ProfileConfig } from "@/lib/editor/types";

export type Role = "user" | "analyst" | "admin";
export type ContentType = "research" | "call" | "short_post";
export type ReportStatus = "draft" | "published" | "archived" | "resolution_pending_review";
export type Direction = "long" | "short" | "hold";
export type Outcome = "open" | "hit" | "near" | "partial" | "miss" | "neutral";
export type AccessType = "free" | "subscribers" | "paid";
export type SubscriptionStatus = "active" | "cancelled" | "expired";
export type TxnType =
  | "deposit"
  | "report_unlock"
  | "subscription"
  | "payout"
  | "refund"
  | "ai_spend"
  | "conversion";
export type TxnStatus = "completed" | "refunded" | "failed";

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  role: Role;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  headline: string | null;
  /** 0-100 analyst score from the engine (tiers, breakdown). */
  score: number;
  /** 600-1400 public display rating. */
  rating: number;
  tier: string;
  /** Score breakdown, persisted at grading time so the analytics page never recomputes from raw calls. */
  wilson_win_rate?: number | null;
  profit_factor?: number | null;
  avg_return?: number | null;
  avg_alpha?: number | null;
  sample_size?: number;
  identity_verified?: boolean;
  followers_count: number;
  /** Monthly subscription price in USD. */
  sub_price: number | null;
  /** Default pay-per-report price in USD. */
  report_price: number | null;
  verified: boolean;
  created_at: string;
  /** Analyst who referred this user (?ref=handle at signup). */
  referred_by?: string | null;
  /** When the user attested they are 18+ at signup. */
  age_attested_at?: string | null;
  profile_config?: ProfileConfig | null;
}

export interface Report {
  id: string;
  author_id: string;
  type: ContentType;
  title: string | null;
  /** Short standfirst / summary shown in feeds. */
  summary: string | null;
  body: string | null;
  status: ReportStatus;
  access: AccessType;
  price: number | null;
  /** Minimum subscription plan rank required when access is subscribers. */
  min_plan_rank?: number;
  /** Perk slugs required on the subscriber's plan (see plans.perks). */
  required_perks?: string[];
  ticker: string | null;
  /** Taxonomy slug (publication_tags) driving discovery placement. */
  primary_tag?: string | null;
  /** Up to 2 further taxonomy slugs, searchable only. */
  secondary_tags?: string[];
  /** Theme anchor for callless publications. */
  theme_tag?: string | null;
  /** Future publish time while still a draft. */
  scheduled_for?: string | null;
  likes: number;
  views: number;
  comment_count: number;
  published_at: string | null;
  /** Set the instant status becomes 'published'; freezes content via a DB trigger. */
  locked_at: string | null;
  created_at: string;
  fact_check_results?: Record<string, unknown> | null;
  /** Mandatory disclosure block — never optional, always shown on published content. */
  position_disclosed: boolean;
  position_held: boolean | null;
  compensation_disclosed: boolean;
  compensation_tied: boolean | null;
  compensation_detail: string | null;
  /** "These are my own views" cert, Reg-AC-style. */
  views_certified: boolean;
  /** sha256 hex digest computed at publish; see ReportSchema. Null pre-migration or if hashing failed. */
  content_hash?: string | null;
  /**
   * Steelman placement gates. The objection and answer text lives in
   * `publication_cards` (kind 'steelman'), not here: `reports` is public-read,
   * so gated prose on it would leak. See migration 0051.
   */
  steelman_box_locked?: boolean;
  steelman_card_locked?: boolean;
  /** Joined author, when the query asks for it. */
  author?: Profile;
  /** The investment card, for research + call types. */
  prediction?: Prediction | null;
}

export type ClaimVerdict = "fact" | "unproven" | "opinion" | "contradicted";

/** One atomic factual assertion extracted from a report body, with its verdict and highlight offsets. */
export interface Claim {
  id: string;
  report_id: string;
  claim_text: string;
  verdict: ClaimVerdict;
  confidence: number | null;
  note: string | null;
  source_url: string | null;
  char_start: number;
  char_end: number;
  created_at: string;
}

/** A debate comment scoped to a single claim — only allowed on `opinion` verdicts. */
export interface DebateComment {
  id: string;
  claim_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: Profile;
}

export interface Prediction {
  id: string;
  report_id: string;
  author_id: string;
  ticker: string;
  direction: Direction;
  /** Entry price locked server-side at publish time. */
  lock_price: number;
  target_price: number | null;
  /** Horizon in days from publish. */
  horizon_days: number;
  /** Last calendar day of the call horizon in the listing exchange timezone. */
  target_horizon_date: string | null;
  resolves_at: string;
  /** Actual trading session date used when weekend/holiday substitution applies. */
  resolution_trading_date: string | null;
  resolved_price: number | null;
  /** SPY price captured at publish, used for alpha. */
  bench_lock_price: number | null;
  /** S&P 500 return over the same window, in percent. */
  benchmark_pct: number | null;
  /** SPY price captured at resolution for audit. */
  bench_resolved_price: number | null;
  outcome: Outcome;
  /** Signed return in percent, direction-aware. Null until resolved. */
  return_pct: number | null;
  created_at: string;
  /** Parent report's status, joined in for callers that render a pendingReview state. */
  report_status?: ReportStatus;
}

export interface Wallet {
  id: string;
  owner_id: string;
  /** Balance in USD. */
  balance: number;
  /** Lifetime earnings for analysts, in USD. */
  earnings: number;
  /** AI feature credits (chat, outlines, fact-checks). */
  ai_credits: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  owner_id: string;
  type: TxnType;
  status: TxnStatus;
  /** Signed amount in USD from the owner's perspective. */
  amount: number;
  /** AI credits delta when type is ai_spend or conversion. */
  credits?: number | null;
  related_id: string | null;
  memo: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  analyst_id: string;
  status: SubscriptionStatus;
  price: number;
  started_at: string;
  renews_at: string;
}

export type AuthState = { error?: string } | null;

export interface ComposeInput {
  id?: string;
  type: ContentType;
  title?: string;
  summary?: string;
  body?: string;
  access: AccessType;
  price?: number | null;
  /** Minimum plan rank when access is subscribers (0 = any subscriber). */
  min_plan_rank?: number;
  /** Required perk slugs when access is subscribers. */
  required_perks?: string[];
  ticker?: string | null;
  direction?: Direction;
  target_price?: number | null;
  horizon_days?: number;
  /** Explicit horizon end date (exchange-local). Must be after today when publishing. */
  target_horizon_date?: string;
  /** Taxonomy slug driving discovery placement. Required to publish. */
  primary_tag?: string | null;
  /** Up to 2 further taxonomy slugs, searchable only. */
  secondary_tags?: string[];
  /** Theme anchor for callless publications; defaults to the primary tag. */
  theme_tag?: string | null;
  /** Future publish time. Held as a draft until the scheduler releases it. */
  scheduled_for?: string | null;
  fact_check_results?: Record<string, unknown> | null;
  /** Mandatory disclosure block — publish is blocked server-side until these are answered. */
  position_held?: boolean;
  compensation_tied?: boolean;
  compensation_detail?: string;
  views_certified?: boolean;
}

export interface SpendResult {
  status?: string;
  spent?: number;
  platform_fee?: number;
  author_share?: number;
  new_balance?: number;
  error?: string;
}

export interface Comment {
  id: string;
  report_id: string;
  author_id: string;
  body: string;
  likes: number;
  created_at: string;
  author?: Profile;
}
