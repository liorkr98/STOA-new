/** Compose-page context shared by slash menu and toolbar (no React prop drilling). */
let reportTicker: string | undefined;

export function setEditorReportTicker(ticker?: string) {
  reportTicker = ticker?.trim().toUpperCase() || undefined;
}

export function getEditorReportTicker(): string | undefined {
  return reportTicker;
}
