/** Mono dateline stamp for a headline row: "2H AGO", "3D AGO", "JUL 20". */
export function sinceLabel(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "JUST NOW";
  if (minutes < 60) return `${minutes}M AGO`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}D AGO`;

  return then
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
    .toUpperCase();
}

/** "0:58" / "12:04" from a duration in seconds. */
export function durationLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

const TYPE_LABEL: Record<string, string> = {
  call: "CALL",
  research: "RESEARCH",
  short_post: "NOTE",
};

export function typeLabel(type: string): string {
  return TYPE_LABEL[type] ?? "NOTE";
}

/** Free / $7 / Subscribers, from the report's own access setting. */
export function accessLabel(access: string, price: number | null): string {
  if (access === "free") return "Free";
  if (access === "subscribers") return "Subscribers";
  return price != null ? `$${price}` : "Paid";
}
