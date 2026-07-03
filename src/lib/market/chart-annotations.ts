/** Serializable chart overlays stored on chartNode attrs (see docs/BACKEND.md). */

export type ChartAnnotation =
  | { id: string; kind: "hline"; price: number }
  | { id: string; kind: "trend"; t1: number; p1: number; t2: number; p2: number };

/** Logical time-scale window (Lightweight Charts visible logical range). */
export interface ChartVisibleRange {
  from: number;
  to: number;
}

export function parseAnnotations(raw: unknown): ChartAnnotation[] {
  if (!Array.isArray(raw)) return [];
  const out: ChartAnnotation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    if (!id) continue;
    if (o.kind === "hline" && typeof o.price === "number") {
      out.push({ id, kind: "hline", price: o.price });
    } else if (
      o.kind === "trend" &&
      typeof o.t1 === "number" &&
      typeof o.p1 === "number" &&
      typeof o.t2 === "number" &&
      typeof o.p2 === "number"
    ) {
      out.push({ id, kind: "trend", t1: o.t1, p1: o.p1, t2: o.t2, p2: o.p2 });
    }
  }
  return out;
}

export function parseVisibleRange(raw: unknown): ChartVisibleRange | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.from !== "number" || typeof o.to !== "number") return null;
  return { from: o.from, to: o.to };
}
