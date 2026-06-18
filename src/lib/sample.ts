import type { Prediction, Profile } from "@/lib/types";
import type { TrackPoint } from "@/components/charts/track-chart";

/**
 * Illustrative data for the marketing surface so the page renders with real
 * components before any analyst has been seeded. Clearly sample, never fake
 * "live" claims.
 */

export const samplePrediction: Prediction = {
  id: "sample",
  report_id: "sample",
  author_id: "sample",
  ticker: "NVDA",
  direction: "long",
  lock_price: 118.42,
  target_price: 142.0,
  horizon_days: 45,
  resolves_at: new Date().toISOString(),
  resolved_price: 137.8,
  bench_lock_price: null,
  bench_resolved_price: null,
  benchmark_pct: 6.1,
  outcome: "hit",
  return_pct: 16.4,
  created_at: new Date().toISOString(),
};

export const sampleTrack: TrackPoint[] = [
  { label: "Jan", rating: 920 },
  { label: "Feb", rating: 905 },
  { label: "Mar", rating: 970 },
  { label: "Apr", rating: 1010 },
  { label: "May", rating: 1065 },
  { label: "Jun", rating: 1120 },
  { label: "Jul", rating: 1158 },
];

export const sampleAnalysts: (Profile & { spark: number[]; resolved: number })[] = [
  {
    id: "s1",
    handle: "maren_vos",
    display_name: "Maren Vos",
    role: "analyst",
    avatar_url: "https://i.pravatar.cc/160?img=47",
    cover_url: null,
    bio: null,
    headline: "Semis and AI infrastructure. Concentrated, high-conviction calls.",
    score: 87,
    rating: 1296,
    tier: "legend",
    followers_count: 12840,
    sub_price: 29,
    report_price: 9,
    verified: true,
    created_at: "",
    spark: [100, 104, 102, 110, 118, 116, 124, 131],
    resolved: 92,
  },
  {
    id: "s2",
    handle: "dhruv_anand",
    display_name: "Dhruv Anand",
    role: "analyst",
    avatar_url: "https://i.pravatar.cc/160?img=12",
    cover_url: null,
    bio: null,
    headline: "Deep value in industrials and energy. Patient, contrarian.",
    score: 74,
    rating: 1192,
    tier: "elite",
    followers_count: 6310,
    sub_price: 19,
    report_price: 7,
    verified: true,
    created_at: "",
    spark: [100, 98, 101, 99, 105, 108, 107, 112],
    resolved: 41,
  },
  {
    id: "s3",
    handle: "lena_kowalczyk",
    display_name: "Lena Kowalczyk",
    role: "analyst",
    avatar_url: "https://i.pravatar.cc/160?img=32",
    cover_url: null,
    bio: null,
    headline: "Consumer and software. Earnings-driven, short horizons.",
    score: 68,
    rating: 1144,
    tier: "elite",
    followers_count: 4180,
    sub_price: 15,
    report_price: 5,
    verified: false,
    created_at: "",
    spark: [100, 103, 109, 106, 104, 110, 114, 118],
    resolved: 33,
  },
];
