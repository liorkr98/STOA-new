import { stoaFetch } from "@/lib/api";
import { STOA_PAGES, type BridgeRequest } from "@/lib/bridge";
import { answerSite, flushTaps, liveSession } from "@/lib/sync";
import { STOA, type DetectAnswer, type Request, type TabStatus } from "@/lib/messages";
import { active, readStored, writeStored } from "@/lib/store";
import type { LocalTap, TickerInfo, VideoTicker } from "@/lib/types";

const infoCache = new Map<string, { at: number; info: TickerInfo }>();
const INFO_MS = 30_000;

async function lookup(videoId: string): Promise<DetectAnswer> {
  try {
    const res = await stoaFetch<{ items: VideoTicker[] | null }>(`/api/extension/detect?videoId=${encodeURIComponent(videoId)}`);
    return { items: res.items };
  } catch (e) {
    return { items: null, error: (e as Error).message };
  }
}

/**
 * A new AI read needs a signed-in reader: Stoa pays for it. Signed out, the
 * extension still shows any video someone signed in has already opened
 * (`lookup`), and reads nothing new.
 */
async function detect(request: Extract<Request, { type: "detect" }>): Promise<DetectAnswer> {
  const session = await liveSession();
  if (!session) return { items: null, error: "signed out" };
  try {
    const res = await stoaFetch<{ items: VideoTicker[] }>(
      "/api/extension/detect",
      { method: "POST", body: JSON.stringify({ videoId: request.videoId, language: request.language, segments: request.segments }) },
      session.accessToken,
    );
    return { items: res.items };
  } catch (e) {
    return { items: null, error: (e as Error).message };
  }
}

async function info(ticker: string): Promise<TickerInfo | null> {
  const hit = infoCache.get(ticker);
  if (hit && Date.now() - hit.at < INFO_MS) return hit.info;
  try {
    const fresh = await stoaFetch<TickerInfo>(`/api/extension/ticker?symbol=${encodeURIComponent(ticker)}`);
    infoCache.set(ticker, { at: Date.now(), info: fresh });
    return fresh;
  } catch {
    return hit?.info ?? null;
  }
}

async function tap(request: Extract<Request, { type: "tap" }>): Promise<{ tapId: string }> {
  const stored = await readStored();
  const local: LocalTap = {
    id: crypto.randomUUID(),
    ticker: request.ticker,
    direction: request.direction,
    videoId: request.videoId,
    videoChannel: request.videoChannel,
    videoSeconds: request.videoSeconds === null ? null : Math.max(0, Math.round(request.videoSeconds)),
    videoTitle: request.videoTitle?.replace(/\s+/g, " ").trim().slice(0, 300) || null,
    at: new Date().toISOString(),
    userId: stored.session?.userId ?? null,
    status: "held",
    undone: false,
  };
  const weekAgo = Date.now() - 8 * 86_400_000;
  // An undone tap that was never sent has nowhere to go; it is forgotten after a week.
  const kept = stored.taps.filter((t) => !(t.undone && t.status === "held" && new Date(t.at).getTime() < weekAgo));
  await writeStored({ taps: [...kept, local] });
  if (stored.session) void flushTaps();
  return { tapId: local.id };
}

async function undo(tapId: string): Promise<null> {
  const stored = await readStored();
  await writeStored({ taps: stored.taps.map((t) => (t.id === tapId ? { ...t, undone: true } : t)) });
  return null;
}

async function open(path: string): Promise<null> {
  await browser.tabs.create({ url: `${STOA}${path.startsWith("/") ? path : `/${path}`}` });
  return null;
}

/** Per tab: the video it shows and what was found, for the popup. Gone when the worker sleeps, which is fine. */
const tabStatus = new Map<number, TabStatus>();

async function toggleQuiet(): Promise<void> {
  const { quiet } = await readStored();
  await writeStored({ quiet: !quiet });
}

/** A small "Q" on the toolbar icon while Quiet mode is on, however it was switched. */
async function showQuiet(): Promise<void> {
  const { quiet } = await readStored();
  await browser.action.setBadgeText({ text: quiet ? "Q" : "" });
}

/** What the YouTube page may ask only once the reader has agreed and the extension is on. */
const NEEDS_CONSENT = new Set<Request["type"]>(["lookup", "detect", "info", "tap"]);

async function handle(request: Request, tabId?: number): Promise<unknown> {
  if (NEEDS_CONSENT.has(request.type) && !active(await readStored())) {
    return request.type === "lookup" || request.type === "detect" ? { items: null, error: "not active" } : null;
  }
  switch (request.type) {
    case "lookup":
      return lookup(request.videoId);
    case "detect":
      return detect(request);
    case "info":
      return info(request.ticker);
    case "tap":
      return tap(request);
    case "undo":
      return undo(request.tapId);
    case "open":
      return open(request.path);
    case "signout":
      return writeStored({ session: null, siteWeek: null }).then(() => null);
    case "status":
      if (tabId !== undefined) tabStatus.set(tabId, { videoId: request.videoId, state: request.state, count: request.count });
      return Promise.resolve(null);
    case "tabStatus":
      return Promise.resolve(tabStatus.get(request.tabId) ?? null);
  }
}

async function openWelcomeIfNeeded(): Promise<void> {
  const { consentedAt } = await readStored();
  if (!consentedAt) await browser.tabs.create({ url: browser.runtime.getURL("/welcome.html") });
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install" || reason === "update") void openWelcomeIfNeeded();
  });
  // Replies through sendResponse and `return true`: Chrome only accepts a
  // returned promise from version 146, and every older Chrome would answer
  // the page with nothing.
  browser.runtime.onMessage.addListener((request: Request, sender, sendResponse) => {
    if (sender.id !== browser.runtime.id) return undefined;
    handle(request, sender.tab?.id).then(sendResponse, () => sendResponse(null));
    return true;
  });

  browser.commands.onCommand.addListener((command) => {
    if (command === "toggle-quiet") void toggleQuiet();
  });
  browser.tabs.onRemoved.addListener((tabId) => tabStatus.delete(tabId));
  browser.storage.onChanged.addListener((changes) => {
    if ("quiet" in changes) void showQuiet();
  });
  void showQuiet();

  // A Stoa page: hands over the session, collects taps for the cart.
  browser.runtime.onMessageExternal.addListener((request: BridgeRequest, sender, sendResponse) => {
    const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : "");
    if (!STOA_PAGES.includes(origin)) return undefined;
    answerSite(request).then(sendResponse, () => sendResponse(null));
    return true;
  });

  void flushTaps();
});
