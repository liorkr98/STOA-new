export function usd(n: number, opts: { cents?: boolean } = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(n);
}

export function price(n: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function pct(n: number | null, withSign = true) {
  if (n == null) return "-";
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function compact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Public 600-1400 rating; falls back from 0-100 score when rating is unset. */
export function analystRating(profile: { rating?: number; score: number }): number {
  if (profile.rating && profile.rating > 600) return profile.rating;
  if (profile.rating === 600 && profile.score > 0) {
    return Math.round(600 + (profile.score / 100) * 800);
  }
  return profile.rating ?? 600;
}
