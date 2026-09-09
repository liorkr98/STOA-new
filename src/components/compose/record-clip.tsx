"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Square, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { MAX_VIDEO_DURATION_SECONDS } from "@/lib/video/constants";

/**
 * Record a clip in the browser, from the camera and microphone.
 *
 * The result is an ordinary File, handed to the same `takeFile` an uploaded
 * clip goes through, so trim, cover, overlays and the upload at publish are
 * one path. Nothing here knows about the timeline or the report.
 *
 * Portrait, like the Feed's stage. A phone camera held upright gives portrait
 * frames and is recorded as is. A laptop webcam gives landscape frames; those
 * are drawn through a canvas that keeps the middle 9:16 of the picture, so the
 * file matches the preview rather than surprising the creator with a wide
 * clip the Feed would crop anyway.
 *
 * Support: `getUserMedia` plus `MediaRecorder`, which is Chrome and Edge,
 * Firefox, and Safari 14.1 or later (iOS 14.5 or later), on a secure origin.
 * Chrome and Firefox write WebM (VP9 or VP8 with Opus); Safari writes MP4
 * (H.264 with AAC). Bunny transcodes either. Where the pair is missing the
 * caller hides the Record choice and offers upload alone.
 */

export type RecordPhase =
  | "explain"
  | "starting"
  | "live"
  | "recording"
  | "review"
  | "denied"
  | "busy"
  | "unavailable";

/** True where the browser can record at all. Client only: reads `navigator`. */
export function recordingSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** Preferred containers, first supported wins. Safari only knows the MP4 ones. */
const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

function extensionFor(mime: string): string {
  return mime.includes("mp4") ? "mp4" : "webm";
}

/* The stage is black in both themes, so its buttons are fixed white on black
 * rather than the theme's ink-on-paper pair, which would vanish on it. */
const ON_STAGE_PRIMARY = "bg-white text-black hover:brightness-95";
const ON_STAGE_GHOST = "text-white/90 hover:bg-white/10";

function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fileStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** The portrait frame recorded from a landscape source: the middle 9:16 of it. */
function portraitCrop(w: number, h: number) {
  const cw = Math.min(w, Math.round((h * 9) / 16));
  return { sx: Math.round((w - cw) / 2), sy: 0, sw: cw, sh: h };
}

/**
 * The stream the recorder should write. A portrait source is recorded as is.
 * A landscape source is drawn onto a portrait canvas, cropped to the middle,
 * and the canvas's stream is recorded with the microphone track alongside.
 */
function recordableStream(
  source: MediaStream,
  video: HTMLVideoElement,
): { stream: MediaStream; stop: () => void } {
  const track = source.getVideoTracks()[0];
  const { width = 0, height = 0 } = track?.getSettings() ?? {};
  const w = width || video.videoWidth;
  const h = height || video.videoHeight;
  if (!w || !h || h >= w) return { stream: source, stop: () => {} };

  const crop = portraitCrop(w, h);
  const canvas = document.createElement("canvas");
  // Even dimensions: some encoders refuse odd ones.
  canvas.width = crop.sw - (crop.sw % 2);
  canvas.height = crop.sh - (crop.sh % 2);
  const ctx = canvas.getContext("2d");
  let raf = 0;
  const draw = () => {
    ctx?.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
    raf = requestAnimationFrame(draw);
  };
  draw();
  const out = canvas.captureStream(30);
  for (const a of source.getAudioTracks()) out.addTrack(a);
  return {
    stream: out,
    stop: () => {
      cancelAnimationFrame(raf);
      for (const t of out.getVideoTracks()) t.stop();
    },
  };
}

export function RecordClip({
  onDone,
  onCancel,
  maxSeconds = MAX_VIDEO_DURATION_SECONDS,
  className,
}: {
  /** The recorded clip and how long it runs, measured by the recorder's own clock. */
  onDone: (file: File, durationSeconds: number) => void;
  /** Back to choosing: upload instead, or give up on the clip for now. */
  onCancel: () => void;
  maxSeconds?: number;
  className?: string;
}) {
  const [phase, setPhase] = useState<RecordPhase>("explain");
  const [elapsed, setElapsed] = useState(0);
  const [mirror, setMirror] = useState(true);
  const [take, setTake] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);

  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const feedRef = useRef<{ stop: () => void } | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(0);

  const releaseCamera = useCallback(() => {
    feedRef.current?.stop();
    feedRef.current = null;
    for (const t of streamRef.current?.getTracks() ?? []) t.stop();
    streamRef.current = null;
    if (liveRef.current) liveRef.current.srcObject = null;
  }, []);

  // Leaving the recorder for any reason turns the camera light off.
  useEffect(() => releaseCamera, [releaseCamera]);
  useEffect(
    () => () => {
      if (take) URL.revokeObjectURL(take.url);
    },
    [take],
  );

  const attachPreview = useCallback((stream: MediaStream) => {
    const v = liveRef.current;
    if (!v) return;
    v.srcObject = stream;
    void v.play().catch(() => {});
  }, []);

  // The live preview element only exists in the live phases, so the stream
  // is attached once the phase has rendered it.
  useEffect(() => {
    if ((phase === "live" || phase === "recording") && streamRef.current) {
      attachPreview(streamRef.current);
    }
  }, [phase, attachPreview]);

  const start = useCallback(async () => {
    setPhase("starting");
    const portrait: MediaStreamConstraints = {
      video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
      audio: true,
    };
    const plain: MediaStreamConstraints = { video: true, audio: true };
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(portrait);
      } catch (err) {
        // A camera that cannot meet the portrait request is still a camera.
        const name = err instanceof DOMException ? err.name : "";
        if (name !== "OverconstrainedError" && name !== "NotFoundError") throw err;
        stream = await navigator.mediaDevices.getUserMedia(plain);
      }
      streamRef.current = stream;
      const facing = stream.getVideoTracks()[0]?.getSettings().facingMode;
      // A front camera is mirrored in the preview, as a mirror is what a person
      // expects to see of themselves; a rear camera is not.
      setMirror(facing !== "environment");
      setPhase("live");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") setPhase("denied");
      else if (name === "NotReadableError" || name === "AbortError") setPhase("busy");
      else setPhase("unavailable");
    }
  }, []);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const begin = useCallback(() => {
    const source = streamRef.current;
    const v = liveRef.current;
    if (!source || !v) return;
    const feed = recordableStream(source, v);
    feedRef.current = feed;
    const mime = pickMime();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(feed.stream, mime ? { mimeType: mime } : undefined);
    } catch {
      feed.stop();
      setPhase("unavailable");
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      window.clearInterval(timerRef.current);
      feed.stop();
      feedRef.current = null;
      const seconds = Math.min(maxSeconds, (performance.now() - startedAtRef.current) / 1000);
      const type = recorder.mimeType || mime || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      setTake((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { blob, url: URL.createObjectURL(blob), seconds };
      });
      setElapsed(0);
      setPhase("review");
    };
    recorderRef.current = recorder;
    startedAtRef.current = performance.now();
    setElapsed(0);
    recorder.start(250);
    setPhase("recording");
    timerRef.current = window.setInterval(() => {
      const s = (performance.now() - startedAtRef.current) / 1000;
      setElapsed(s);
      if (s >= maxSeconds) stop();
    }, 200);
  }, [maxSeconds, stop]);

  const again = useCallback(() => {
    setTake((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    setPhase(streamRef.current ? "live" : "explain");
  }, []);

  const keep = useCallback(() => {
    if (!take) return;
    const ext = extensionFor(take.blob.type);
    const file = new File([take.blob], `stoa-recording-${fileStamp(new Date())}.${ext}`, {
      type: take.blob.type,
    });
    releaseCamera();
    onDone(file, take.seconds);
  }, [take, onDone, releaseCamera]);

  const leave = useCallback(() => {
    stop();
    releaseCamera();
    onCancel();
  }, [stop, releaseCamera, onCancel]);

  const remaining = Math.max(0, maxSeconds - elapsed);
  const showLive = phase === "live" || phase === "recording" || phase === "starting";

  return (
    <div className={cn("flex flex-col items-center gap-4", className)} aria-live="polite">
      {/* The stage: portrait, like the Feed. The shutter sits inside it at the
          bottom, as in a camera app, so the picture can take the room and the
          control still lands above the fold on a phone. */}
      <div className="relative aspect-[9/16] w-full max-w-[min(100%,calc(55vh*9/16))] overflow-hidden rounded-[var(--radius-card)] bg-black">
        {showLive ? (
          <video
            ref={liveRef}
            muted
            playsInline
            autoPlay
            className={cn("absolute inset-0 h-full w-full object-cover", mirror && "-scale-x-100")}
          />
        ) : null}
        {phase === "review" && take ? (
          <video
            src={take.url}
            controls
            playsInline
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />
        ) : null}

        {phase === "explain" ? (
          <Notice
            icon={<Camera size={24} strokeWidth={1.6} />}
            title="Record with your camera"
            body="Stoa needs your camera and microphone to record. The clip stays on this device until you publish; nothing is sent before then."
          >
            <Button variant="primary" size="md" className={ON_STAGE_PRIMARY} onClick={() => void start()}>
              Turn on camera
            </Button>
            <Button variant="ghost" size="md" className={ON_STAGE_GHOST} onClick={leave}>
              <Upload size={16} strokeWidth={1.6} /> Upload a file instead
            </Button>
          </Notice>
        ) : null}

        {phase === "starting" ? (
          <p className="absolute inset-x-0 bottom-4 text-center text-[13px] text-white/80">Waiting for the camera…</p>
        ) : null}

        {phase === "denied" ? (
          <Notice
            icon={<Camera size={24} strokeWidth={1.6} />}
            title="Camera access was refused"
            body="To record, allow the camera and microphone for this site in your browser's settings, then try again. Or upload a clip you already have."
          >
            <Button variant="primary" size="md" className={ON_STAGE_PRIMARY} onClick={() => void start()}>
              Try again
            </Button>
            <Button variant="ghost" size="md" className={ON_STAGE_GHOST} onClick={leave}>
              <Upload size={16} strokeWidth={1.6} /> Upload a file instead
            </Button>
          </Notice>
        ) : null}

        {phase === "busy" ? (
          <Notice
            icon={<Camera size={24} strokeWidth={1.6} />}
            title="The camera is busy"
            body="Another app or tab is using it. Close that and try again, or upload a clip you already have."
          >
            <Button variant="primary" size="md" className={ON_STAGE_PRIMARY} onClick={() => void start()}>
              Try again
            </Button>
            <Button variant="ghost" size="md" className={ON_STAGE_GHOST} onClick={leave}>
              <Upload size={16} strokeWidth={1.6} /> Upload a file instead
            </Button>
          </Notice>
        ) : null}

        {phase === "unavailable" ? (
          <Notice
            icon={<Camera size={24} strokeWidth={1.6} />}
            title="No camera on this device"
            body="Recording needs a camera and a microphone this browser can reach. Upload a clip you already have instead."
          >
            <Button variant="primary" size="md" className={ON_STAGE_PRIMARY} onClick={leave}>
              <Upload size={16} strokeWidth={1.6} /> Upload a file
            </Button>
          </Notice>
        ) : null}

        {phase === "recording" ? (
          <div className="num absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-2.5 py-1 text-[12px] tracking-[0.08em] text-white">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--rust)]" />
            <span>REC {mmss(elapsed)}</span>
          </div>
        ) : null}
        {phase === "live" ? (
          <p className="num absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/90">
            Up to {mmss(maxSeconds)}
          </p>
        ) : null}
        {phase === "review" && take ? (
          <p className="num absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/90">
            {mmss(take.seconds)} recorded
          </p>
        ) : null}

        {/* The shutter, over the picture at the bottom, where a thumb reaches. */}
        {phase === "live" ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent)] px-3 pb-4 pt-10">
            <Button variant="ghost" size="sm" className={ON_STAGE_GHOST} onClick={leave}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={begin}
              aria-label="Start recording"
              className="focus-ring flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white bg-transparent active:scale-[0.97]"
            >
              <span aria-hidden className="h-12 w-12 rounded-full bg-[var(--rust)]" />
            </button>
            {/* Same width as Cancel so the shutter stays centred. */}
            <span className="invisible" aria-hidden>
              <Button variant="ghost" size="sm" tabIndex={-1}>
                Cancel
              </Button>
            </span>
          </div>
        ) : null}

        {phase === "recording" ? (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent)] px-3 pb-4 pt-10">
            <button
              type="button"
              onClick={stop}
              aria-label="Stop recording"
              className="focus-ring flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white bg-transparent active:scale-[0.97]"
            >
              <Square size={22} fill="var(--rust)" strokeWidth={0} />
            </button>
            <p className="num text-[11px] uppercase tracking-[0.14em] text-white/90">
              {mmss(remaining)} left
            </p>
          </div>
        ) : null}
      </div>

      {phase === "review" && take ? (
        <div className="flex w-full max-w-[min(100%,calc(55vh*9/16))] items-center justify-center gap-2">
          <Button variant="secondary" size="md" onClick={again}>
            <RotateCcw size={16} strokeWidth={1.6} /> Record again
          </Button>
          <Button variant="primary" size="md" onClick={keep}>
            Use this clip
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Notice({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
      <span className="text-white/90">{icon}</span>
      <p className="font-display text-[1.125rem] font-semibold leading-tight">{title}</p>
      <p className="text-[13px] leading-relaxed text-white/80">{body}</p>
      <div className="mt-2 flex flex-col items-center gap-2">{children}</div>
    </div>
  );
}
