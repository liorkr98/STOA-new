import { parseSegmentBlocks, transcriptLanguage, type Segment } from "@/lib/transcript";

const PANEL_IDS = ["engagement-panel-searchable-transcript", "PAmodern_transcript_view"];
const PANEL_SELECTOR = PANEL_IDS.map((id) => `ytd-engagement-panel-section-list-renderer[target-id="${id}"]`).join(",");
const SEGMENT_SELECTOR = "ytd-transcript-segment-renderer, transcript-segment-view-model";
const OPEN_BUTTON = "ytd-video-description-transcript-section-renderer button";
const EXPANDED = "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED";
const HIDDEN = "ENGAGEMENT_PANEL_VISIBILITY_HIDDEN";
const STYLE_ID = "stoa-transcript-quiet";

/**
 * The panel only fetches its lines while it is in the viewport, so it is not
 * pushed off screen: it stays where it is, see-through, under the page and
 * unclickable, for the second or two it takes to load.
 */
const QUIET_CSS = `${PANEL_IDS.map((id) => `ytd-engagement-panel-section-list-renderer[target-id="${id}"].stoa-quiet`).join(",")}{position:fixed!important;top:0!important;right:0!important;width:360px!important;height:480px!important;opacity:0!important;pointer-events:none!important;z-index:-1!important}`;

export type PanelTranscript = { segments: Segment[]; language: string; label: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor<T>(read: () => T | null | undefined, timeoutMs: number, everyMs = 250): Promise<T | null> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const value = read();
    if (value) return value;
    await sleep(everyMs);
  }
  return null;
}

function panels(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(PANEL_SELECTOR)];
}

function readPanel(panel: HTMLElement, duration?: number): PanelTranscript | null {
  const blocks = [...panel.querySelectorAll<HTMLElement>(SEGMENT_SELECTOR)].map((el) => el.innerText || el.textContent || "");
  const segments = parseSegmentBlocks(blocks, duration);
  if (segments.length === 0) return null;
  const label =
    panel.querySelector<HTMLElement>("ytd-transcript-footer-renderer, yt-sort-filter-sub-menu-renderer")?.innerText?.trim() || null;
  return { segments, language: transcriptLanguage(label, segments), label };
}

/**
 * The fallback reader: asks YouTube's own transcript panel to load, without
 * showing it, and reads the lines it draws. If the reader already has the
 * panel open, it is read as it is and left open.
 */
export async function readTranscriptFromPanel(videoId: string, duration?: number): Promise<PanelTranscript | null> {
  const onVideo = () => new URLSearchParams(location.search).get("v") === videoId;

  const open = panels().find((p) => p.getAttribute("visibility") === EXPANDED);
  if (open) {
    const read = readPanel(open, duration);
    if (read) return read;
  }

  const button = await waitFor(() => (onVideo() ? document.querySelector<HTMLButtonElement>(OPEN_BUTTON) : null), 20_000);
  if (!button || !onVideo()) return null;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = QUIET_CSS;
    document.head.appendChild(style);
  }

  // Marked before the click, so the panel is never drawn visible for a frame.
  const marker = new MutationObserver(() => panels().forEach((p) => p.classList.add("stoa-quiet")));
  marker.observe(document.body, { childList: true, subtree: true });
  panels().forEach((p) => p.classList.add("stoa-quiet"));
  const scroll = window.scrollY;

  try {
    button.click();
    const panel = await waitFor(
      () => panels().find((p) => p.getAttribute("visibility") === EXPANDED && p.querySelector(SEGMENT_SELECTOR)) ?? null,
      15_000,
    );
    if (!panel || !onVideo()) return null;
    // The list arrives in one response; a short settle catches the last rows.
    await sleep(400);
    return readPanel(panel, duration);
  } finally {
    marker.disconnect();
    for (const p of panels()) {
      if (p.classList.contains("stoa-quiet")) {
        p.setAttribute("visibility", HIDDEN);
        p.classList.remove("stoa-quiet");
      }
    }
    if (window.scrollY !== scroll) window.scrollTo({ top: scroll });
  }
}
