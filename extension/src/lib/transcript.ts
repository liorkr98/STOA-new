/** One caption line with its place in the video, in seconds. */
export type Segment = { start: number; end: number; text: string };

const TIMESTAMP = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/;

/** "1:02:03" or "4:19" to seconds; null for anything else. */
export function parseTimestamp(raw: string): number | null {
  const m = TIMESTAMP.exec(raw.trim());
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const DURATION_UNITS =
  "seconds?|minutes?|hours?|שנייה|שניה|שניות|דקה|דקות|שעה|שעות|segundos?|minutos?|horas?|Sekunden?|Minuten?|Stunden?";
const DURATION_PART = `(?:\\d+\\s+(?:${DURATION_UNITS})|(?:${DURATION_UNITS})\\s+\\d+|(?:דקה|שעה|שנייה)\\s+אחת)`;
const ACCESSIBILITY_LINE = new RegExp(`^${DURATION_PART}(?:\\s*(?:,|ו|and)\\s*${DURATION_PART})*$`, "iu");

/**
 * The newer transcript markup reads each timestamp twice: "0:08", then a line
 * for screen readers, "8 seconds". Only a line right after the timestamp that
 * is nothing but a duration is that line; a caption saying "5 seconds" later
 * in a sentence is kept.
 */
export function isAccessibilityLine(line: string): boolean {
  return ACCESSIBILITY_LINE.test(line.trim());
}

/**
 * Each block is one segment's visible text as the panel draws it: the
 * timestamp on the first line, maybe the duration line, then the words.
 * Chapter headings (no timestamp) are skipped. A segment ends where the next
 * one starts; the last runs to `duration`, or five seconds.
 */
export function parseSegmentBlocks(blocks: string[], duration?: number): Segment[] {
  const starts: { start: number; text: string }[] = [];
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    const start = parseTimestamp(lines[0]);
    if (start === null) continue;
    let rest = lines.slice(1);
    if (rest.length > 1 && isAccessibilityLine(rest[0])) rest = rest.slice(1);
    const text = rest.join(" ").replace(/\s+/g, " ").trim();
    if (text) starts.push({ start, text });
  }
  starts.sort((a, b) => a.start - b.start);
  return starts.map((s, i) => {
    const next = starts[i + 1]?.start;
    const end = next ?? (duration && duration > s.start ? Math.min(duration, s.start + 10) : s.start + 5);
    return { start: s.start, end: Math.max(end, s.start), text: s.text };
  });
}

/**
 * The transcript's language as a short code. The panel names it
 * ("Hebrew (auto-generated)"); when it does not, the script decides.
 */
export function transcriptLanguage(label: string | null, segments: Segment[]): string {
  const l = (label ?? "").toLowerCase();
  if (/hebrew|עברית/.test(l)) return "he";
  if (/english|אנגלית/.test(l)) return "en";
  const sample = segments
    .slice(0, 80)
    .map((s) => s.text)
    .join(" ");
  const hebrew = (sample.match(/[֐-׿]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  return hebrew > latin ? "he" : "en";
}
