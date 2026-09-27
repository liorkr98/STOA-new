import { publicTypeLabel } from "@/lib/compose/modes";
import type { ContentType } from "@/lib/types";
import { labelCase } from "@/lib/design/label";

/** How long ago, in sentence case: "Just now", "5m ago", "2h ago", "3d ago", "Jul 20". */
export function sinceLabel(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return then
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

/** "0:58" / "12:04" from a duration in seconds. */
export function durationLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** The printed type. A retired verdict (`call`) reads as a thesis until 0067 relabels it. */
export function typeLabel(type: string): string {
  return labelCase(publicTypeLabel(type as ContentType));
}

/** Free / $7 / Subscribers, from the report's own access setting. */
export function accessLabel(access: string, price: number | null): string {
  if (access === "free") return "Free";
  if (access === "subscribers") return "Subscribers";
  return price != null ? `$${price}` : "Paid";
}

/** "Sunday 27 September": the dateline's day, from a New York calendar date. */
export function todayDateLabel(dateIso: string | null | undefined): string {
  const [y, m, d] = (dateIso ?? "").split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d, 17))
    .toLocaleDateString("en-GB", { timeZone: "America/New_York", weekday: "long", day: "numeric", month: "long" })
    .replace(",", "");
}

/** "14 new publications", or a plain word for a quiet day. */
export function publishedTodayLabel(count: number): string {
  if (count <= 0) return "Nothing new yet today";
  return count === 1 ? "1 new publication" : `${count} new publications`;
}
