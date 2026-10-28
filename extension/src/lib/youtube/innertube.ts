import type { DirectSegment, VideoDetails } from "@/lib/youtube/page-bridge";

/** Runs in the page's world only. */
type YtCfg = { get(key: string): unknown };
type Player = HTMLElement & { getPlayerResponse?: () => { videoDetails?: Record<string, unknown> } | undefined };

function cfg(): YtCfg | null {
  return ((window as unknown as { ytcfg?: YtCfg }).ytcfg ?? null);
}

export function videoDetails(videoId: string): VideoDetails | null {
  const player = document.getElementById("movie_player") as Player | null;
  const details = player?.getPlayerResponse?.()?.videoDetails;
  if (!details || details.videoId !== videoId) return null;
  const length = Number(details.lengthSeconds);
  return {
    videoId,
    title: typeof details.title === "string" ? details.title : null,
    channel: typeof details.author === "string" ? details.author : null,
    channelId: typeof details.channelId === "string" ? details.channelId : null,
    isLive: details.isLive === true || details.isUpcoming === true,
    duration: Number.isFinite(length) && length > 0 ? length : null,
  };
}

function findKey(root: unknown, key: string): unknown {
  const stack: unknown[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    for (const [k, v] of Object.entries(node)) {
      if (k === key) return v;
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

function collectSegments(root: unknown): DirectSegment[] {
  const out: DirectSegment[] = [];
  const stack: unknown[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    const seg = (node as Record<string, unknown>).transcriptSegmentRenderer as
      | { startMs?: string; endMs?: string; snippet?: { runs?: { text?: string }[]; simpleText?: string } }
      | undefined;
    if (seg?.startMs) {
      const text = (seg.snippet?.simpleText ?? (seg.snippet?.runs ?? []).map((r) => r.text ?? "").join("")).replace(/\s+/g, " ").trim();
      if (text) out.push({ start: Number(seg.startMs) / 1000, end: Number(seg.endMs ?? seg.startMs) / 1000, text });
      continue;
    }
    for (const v of Object.values(node)) if (v && typeof v === "object") stack.push(v);
  }
  return out.sort((a, b) => a.start - b.start);
}

let directRefused = false;

/**
 * The request YouTube's transcript panel makes, sent from the page without
 * opening the panel. YouTube now attaches a token from its own anti-abuse
 * check to that request and answers 400 without it; the token is not ours to
 * make, so once refused this is not tried again in the tab and the caller
 * falls back to the panel.
 */
export async function directTranscript(videoId: string): Promise<DirectSegment[] | null> {
  if (directRefused) return null;
  const c = cfg();
  const context = c?.get("INNERTUBE_CONTEXT");
  if (!context) return null;
  const headers = {
    "content-type": "application/json",
    "x-youtube-client-name": String(c?.get("INNERTUBE_CONTEXT_CLIENT_NAME") ?? "1"),
    "x-youtube-client-version": String(c?.get("INNERTUBE_CLIENT_VERSION") ?? ""),
  };
  try {
    const next = await fetch("/youtubei/v1/next?prettyPrint=false", {
      method: "POST",
      headers,
      body: JSON.stringify({ context, videoId }),
    }).then((r) => (r.ok ? r.json() : null));
    const endpoint = findKey(next, "getTranscriptEndpoint") as { params?: string } | null;
    if (!endpoint?.params) return null;
    const res = await fetch("/youtubei/v1/get_transcript?prettyPrint=false", {
      method: "POST",
      headers,
      body: JSON.stringify({ context, params: endpoint.params }),
    });
    if (!res.ok) {
      if (res.status === 400 || res.status === 403) directRefused = true;
      return null;
    }
    const segments = collectSegments(await res.json());
    return segments.length ? segments : null;
  } catch {
    return null;
  }
}
