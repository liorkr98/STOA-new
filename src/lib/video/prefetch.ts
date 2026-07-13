/**
 * Video prefetching engine (client). Warms the CDN edge and browser cache for
 * roughly the first 5 seconds of a clip *before* the viewer taps play, so inline
 * playback starts instantly instead of buffering.
 *
 * Strategy, cheapest first:
 *   1. preconnect / dns-prefetch to the Bunny CDN + embed hosts (on mount).
 *   2. On hover (desktop) or scroll-into-view (mobile), fetch the HLS master +
 *      first media playlist, then prefetch segments until ~5s is accumulated.
 *
 * Everything is fire-and-forget and de-duplicated. Segment fetches use
 * `no-cors` (we only need them cached, not readable); playlists need CORS to be
 * parsed, and fail soft to a bare warm-up fetch if the CDN blocks it.
 */

const PREFETCH_SECONDS = 5;
const MAX_SEGMENTS = 6;

const warmedHosts = new Set<string>();
const prefetchedStreams = new Set<string>();

function addLink(rel: string, href: string) {
  if (typeof document === "undefined") return;
  const existing = document.head.querySelector(`link[rel="${rel}"][href="${href}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (rel === "preconnect") link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/** Preconnect to the hosts a clip will load from. Call on mount / in-view. */
export function warmVideoConnections(...urls: (string | null | undefined)[]) {
  for (const url of urls) {
    if (!url) continue;
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      continue;
    }
    if (warmedHosts.has(origin)) continue;
    warmedHosts.add(origin);
    addLink("preconnect", origin);
    addLink("dns-prefetch", origin);
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    // CORS or network: fall back to a cache-warming opaque fetch.
    try {
      await fetch(url, { mode: "no-cors", credentials: "omit" });
    } catch {
      /* ignore */
    }
    return null;
  }
}

/** Prefetch the first ~5s of a clip's HLS stream. Safe to call repeatedly. */
export async function prefetchVideoStart(playbackUrl: string | null | undefined): Promise<void> {
  if (!playbackUrl || prefetchedStreams.has(playbackUrl)) return;
  prefetchedStreams.add(playbackUrl);
  warmVideoConnections(playbackUrl);

  const master = await fetchText(playbackUrl);
  if (!master) return;

  // Resolve the first variant playlist (or the master if it is already a media playlist).
  let mediaUrl = playbackUrl;
  if (master.includes("#EXT-X-STREAM-INF")) {
    const variant = master
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#"));
    if (variant) mediaUrl = new URL(variant, playbackUrl).toString();
  }

  const media = mediaUrl === playbackUrl ? master : await fetchText(mediaUrl);
  if (!media) return;

  const lines = media.split("\n").map((l) => l.trim());
  let accumulated = 0;
  let segments = 0;

  for (let i = 0; i < lines.length && accumulated < PREFETCH_SECONDS && segments < MAX_SEGMENTS; i++) {
    const line = lines[i];

    // fMP4 init segment must be fetched first to decode anything.
    if (line.startsWith("#EXT-X-MAP:")) {
      const m = line.match(/URI="([^"]+)"/);
      if (m) void warmSegment(new URL(m[1], mediaUrl).toString());
      continue;
    }

    if (line.startsWith("#EXTINF:")) {
      const dur = Number.parseFloat(line.slice("#EXTINF:".length));
      const seg = lines[i + 1];
      if (seg && !seg.startsWith("#")) {
        void warmSegment(new URL(seg, mediaUrl).toString());
        accumulated += Number.isFinite(dur) ? dur : 2;
        segments += 1;
      }
    }
  }
}

async function warmSegment(url: string): Promise<void> {
  try {
    await fetch(url, { mode: "no-cors", credentials: "omit" });
  } catch {
    /* ignore */
  }
}
