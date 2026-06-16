/**
 * Domain types shared across the engine, the data layer, and the UI.
 * These mirror the Postgres schema in supabase/migrations.
 */

export type Role = "user" | "analyst" | "admin";
export type ContentType = "research" | "call" | "short_post";
export type ReportStatus = "draft" | "published" | "archived";
export type Direction = "long" | "short" | "hold";
export type Outcome = "open" | "hit" | "near" | "partial" | "miss";
export type AccessType = "free" | "subscribers" | "paid";
export type SubscriptionStatus = "active" | "cancelled" | "expired";
export type TxnType =
  | "deposit"
  | "report_unlock"
  | "subscription"
  | "payout"
  | "refund";
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
  /** 0-100 analyst score from the engine. */
  score: number;
  tier: string;
  followers_count: number;
  /** Monthly subscription price in USD. */
  sub_price: number | null;
  /** Default pay-per-report price in USD. */
  report_price: number | null;
  verified: boolean;
  created_at: string;
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
  ticker: string | null;
  likes: number;
  views: number;
  comment_count: number;
  published_at: string | null;
  created_at: string;
  /** Joined author, when the query asks for it. */
  author?: Profile;
  /** The investment card, for research + call types. */
  prediction?: Prediction | null;
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
  resolves_at: string;
  resolved_price: number | null;
  /** SPY price captured at publish, used for alpha. */
  bench_lock_price: number | null;
  /** S&P 500 return over the same window, in percent. */
  benchmark_pct: number | null;
  outcome: Outcome;
  /** Signed return in percent, direction-aware. Null until resolved. */
  return_pct: number | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  owner_id: string;
  /** Balance in USD. */
  balance: number;
  /** Lifetime earnings for analysts, in USD. */
  earnings: number;
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

export interface Comment {
  id: string;
  report_id: string;
  author_id: string;
  body: string;
  likes: number;
  created_at: string;
  author?: Profile;
}
