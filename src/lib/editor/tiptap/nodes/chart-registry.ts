/**
 * Live chartNode instances register a screenshot capture here, keyed by their
 * stable nodeId. The publish flow (screenshot-at-publish) walks the document,
 * looks each chartNode up by nodeId, captures the PNG, and uploads it. Only
 * editor-mode charts register; reading-mode charts never capture.
 */
export interface ChartCaptureHandle {
  /** Current document position of this chart node. */
  getPos: () => number | undefined;
  /** Resolves the chart canvas as a PNG blob, or null if unavailable. */
  takeScreenshot: () => Promise<Blob | null>;
}

const registry = new Map<string, ChartCaptureHandle>();

export function registerChart(nodeId: string, handle: ChartCaptureHandle) {
  registry.set(nodeId, handle);
}

export function unregisterChart(nodeId: string) {
  registry.delete(nodeId);
}

export function getChartHandle(nodeId: string): ChartCaptureHandle | undefined {
  return registry.get(nodeId);
}
