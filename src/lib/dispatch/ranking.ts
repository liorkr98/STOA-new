import type { Report } from "@/lib/types";

export function inCycle(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/**
 * Rank candidates for lead / secondary slots (higher = more prominent).
 * A declared stance (a ticker and a direction) takes the weight a locked
 * call had: it is the piece committing to a view. Nothing about the
 * analyst's record or any outcome enters.
 */
export function scoreReportForDispatch(report: Report, cycleStart: Date, cycleEnd: Date): number {
  let score = 0;
  const published = report.published_at ?? report.created_at;

  if (inCycle(published, cycleStart, cycleEnd)) score += 40;
  if (report.ticker && report.stance) score += 25;
  score += Math.min(report.likes ?? 0, 30);
  score += Math.min(report.comment_count ?? 0, 20) * 2;

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
