/**
 * HLS attachment for `<video>`.
 *
 * Safari and iOS play HLS natively, so they never download hls.js. Everything
 * else loads it on demand, the first time an HLS clip actually plays, which
 * keeps it out of the Feed's initial payload.
 *
 * Adaptive bitrate is the reason this exists: a phone on a slow connection
 * should get a low rendition and a picture, not a full-quality stall.
 */

export function canPlayHlsNatively(video: HTMLVideoElement): boolean {
  return (
    video.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    video.canPlayType("application/x-mpegURL") !== ""
  );
}

export interface HlsAttachment {
  destroy: () => void;
}

/**
 * Returns null when the caller should just set `video.src` itself (native
 * support), and an attachment to tear down when hls.js took over.
 *
 * `onFatalError` fires when the stream cannot be played at all, so the caller
 * can fall back to a provider embed instead of showing a dead frame.
 */
export async function attachHls(
  video: HTMLVideoElement,
  src: string,
  onFatalError: () => void,
): Promise<HlsAttachment | null> {
  if (canPlayHlsNatively(video)) return null;

  const { default: Hls } = await import("hls.js");
  if (!Hls.isSupported()) {
    onFatalError();
    return null;
  }

  const hls = new Hls({
    // A feed clip is short and starts muted; keep the buffer small so we are
    // not paying for video the reader scrolls past.
    maxBufferLength: 12,
    maxMaxBufferLength: 30,
    // Start conservatively and let ABR climb, rather than opening on the top
    // rendition and stalling on mobile data.
    startLevel: -1,
    capLevelToPlayerSize: true,
  });

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal) return;
    hls.destroy();
    onFatalError();
  });

  hls.loadSource(src);
  hls.attachMedia(video);

  return { destroy: () => hls.destroy() };
}
