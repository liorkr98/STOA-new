/** Chart screenshot helpers for Tiptap chartNode + legacy block editor charts. */

export interface ChartBodyStats {
  screenshotUrls: string[];
  chartCount: number;
  hasScreenshots: boolean;
}

function walkBody(node: unknown, urls: Set<string>, chartCount: { n: number }) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walkBody(child, urls, chartCount);
    return;
  }

  const obj = node as Record<string, unknown>;

  if (obj.type === "chartNode" || obj.type === "chart") {
    chartCount.n += 1;
  }

  const attrs = obj.attrs;
  if (attrs && typeof attrs === "object") {
    const url = (attrs as Record<string, unknown>).screenshotUrl;
    if (typeof url === "string" && url.trim()) urls.add(url.trim());
  }

  const content = obj.content;
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const blockUrl = (content as Record<string, unknown>).screenshotUrl;
    if (typeof blockUrl === "string" && blockUrl.trim()) urls.add(blockUrl.trim());
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") walkBody(value, urls, chartCount);
  }
}

export function parseReportBodyJson(body: string | null | undefined): unknown | null {
  if (!body?.trim()) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export function analyzeChartBody(body: string | null | undefined): ChartBodyStats {
  const doc = parseReportBodyJson(body);
  const urls = new Set<string>();
  const chartCount = { n: 0 };
  if (doc) walkBody(doc, urls, chartCount);
  const screenshotUrls = [...urls];
  return {
    screenshotUrls,
    chartCount: chartCount.n,
    hasScreenshots: screenshotUrls.length > 0,
  };
}

/** Expected public URL prefix for chart PNGs owned by this creator/report. */
export function chartSnapshotUrlPrefix(creatorId: string, reportId: string): string {
  const base =
    process.env.SUPABASE_STORAGE_URL ??
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;
  return `${base.replace(/\/$/, "")}/chart-snapshots/${creatorId}/${reportId}/`;
}

export function validateChartScreenshotUrls(
  urls: string[],
  creatorId: string,
  reportId: string,
): string | null {
  if (urls.length === 0) return null;
  const prefix = chartSnapshotUrlPrefix(creatorId, reportId);
  for (const url of urls) {
    if (!url.startsWith(prefix)) {
      return `Invalid chart screenshot URL. Each screenshot must be uploaded to your chart-snapshots folder for this report.`;
    }
    if (!url.endsWith(".png")) {
      return `Chart screenshots must be PNG files in chart-snapshots storage.`;
    }
  }
  return null;
}
