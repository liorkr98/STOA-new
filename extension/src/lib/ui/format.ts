export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function price(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Today's move with its sign: a price move, so it may be green or red. */
export function move(pct: number | null): { text: string; tone: "up" | "down" | "mute" } | null {
  if (pct === null || !Number.isFinite(pct)) return null;
  const text = `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct).toFixed(2)}%`;
  return { text, tone: pct > 0 ? "up" : pct < 0 ? "down" : "mute" };
}

export function bigMoney(n: number | null): string {
  if (n === null || !Number.isFinite(n) || n <= 0) return "–";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

export function day(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** A thin line through the closes, scaled to the box. */
export function sparkPath(closes: number[], w = 360, h = 88): string {
  if (closes.length < 2) return "";
  const lo = Math.min(...closes);
  const hi = Math.max(...closes);
  const span = hi - lo || 1;
  return closes
    .map((c, i) => `${i === 0 ? "M" : "L"}${((i / (closes.length - 1)) * w).toFixed(1)},${(h - 4 - ((c - lo) / span) * (h - 8)).toFixed(1)}`)
    .join(" ");
}
