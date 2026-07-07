import type { Prediction, Report } from "@/lib/types";

export function inCycle(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/** Rank candidates for lead / secondary slots (higher = more prominent). */
export function scoreReportForDispatch(report: Report, cycleStart: Date, cycleEnd: Date): number {
  let score = 0;
  const p = report.prediction;
  const published = report.published_at ?? report.created_at;
  const inWindow = inCycle(published, cycleStart, cycleEnd);

  if (inWindow) score += 40;
  if (report.type === "call") score += 25;
  if (p?.target_price) score += 20;
  score += Math.min(report.likes ?? 0, 30);
  score += Math.min(report.comment_count ?? 0, 20) * 2;
  score += Math.min(report.author?.score ?? 0, 100) * 0.15;

  if (p && p.outcome !== "open" && inCycle(p.resolves_at ?? published, cycleStart, cycleEnd)) {
    if (p.outcome === "hit") score += 80;
    else if (p.outcome === "near") score += 50;
    score += Math.abs(p.return_pct ?? 0) * 0.5;
  }

  return score;
}

export function scoreResolvedPrediction(p: Prediction): number {
  let score = 0;
  if (p.outcome === "hit") score += 100;
  else if (p.outcome === "near") score += 60;
  else if (p.outcome === "partial") score += 30;
  score += Math.abs(p.return_pct ?? 0);
  return score;
}

export function estimateReadMinutes(texts: string[]): number {
  const words = texts.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function storyHeadline(report: Report): string {
  return report.title?.trim() || report.summary?.trim() || "Untitled research";
}

export function storyDek(report: Report): string | null {
  if (report.title && report.summary) return report.summary;
  return null;
}

export function walkCycleOffsets(maxDays = 7): number[] {
  return Array.from({ length: maxDays }, (_, i) => -i);
}
