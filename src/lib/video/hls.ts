/**
 * HLS attachment for `<video>`.
 *
 * Adaptive bitrate is the reason this exists: a phone on a slow connection
 * should get a low rendition and a picture, not a full-quality stall.
 *
 * Which engine plays the stream is decided by Media Source Extensions, not by
 * `canPlayType`. Chrome answers "maybe" to the HLS mime types (it answers
 * "maybe" to almost everything) while being unable to play a manifest, so
 * trusting it there hands Chrome a stream it cannot decode and skips hls.js
 * entirely. MSE is the honest signal, and it also keeps iOS lean: iPhone has no
 * plain `MediaSource`, so it takes the native path and never downloads hls.js.
 */

/** Present on Chrome, Firefox, Edge and desktop Safari; absent on iPhone. */
function hasMediaSource(): boolean {
  return typeof window !== "undefined" && "MediaSource" in window;
}

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
  // No MSE means iPhone, where the element is the only player available.
  if (!hasMediaSource()) {
    if (canPlayHlsNatively(video)) return null;
    onFatalError();
    return null;
  }

  const { default: Hls } = await import("hls.js");
  if (!Hls.isSupported()) {
    if (canPlayHlsNatively(video)) return null;
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
