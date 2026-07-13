"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Video,
  Upload,
  Square,
  Loader2,
  Check,
  AlertTriangle,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_VIDEO_DURATION_SECONDS } from "@/lib/video/constants";
import { uploadToBunnyTus } from "@/lib/video/tus-upload";

type Step = "choose" | "recording" | "uploading" | "processing" | "review" | "done";

interface BlockingClaim {
  text: string;
  verdict: string;
}

interface UploadSession {
  clipId: string;
  guid: string;
  upload: {
    endpoint: string;
    libraryId: string;
    videoId: string;
    authorizationSignature: string;
    authorizationExpire: number;
  };
}

/**
 * Video creation flow (Part 3). Deliberately plain and functional -- trust-
 * adjacent, hand-built to the six-token system, no scaffolding flourishes.
 *
 * Steps: record or upload (<=90s) -> direct-to-Bunny upload -> processing +
 * captions -> transcript review + read-only disclosure preview -> fact-check
 * gate on publish. The video is an artifact attached to an already-locked
 * report; there is no separate lock ceremony here.
 */
export function AddVideoFlow({
  reportId,
  reportTitle,
  disclosure,
  onClose,
  onPublished,
}: {
  reportId: string;
  reportTitle: string;
  disclosure: { positionHeld: boolean | null; compensationTied: boolean | null };
  onClose: () => void;
  onPublished?: () => void;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(MAX_VIDEO_DURATION_SECONDS);
  const [transcript, setTranscript] = useState("");
  const [captionsReady, setCaptionsReady] = useState(false);
  const [blockingClaims, setBlockingClaims] = useState<BlockingClaim[]>([]);
  const [publishing, setPublishing] = useState(false);

  const clipIdRef = useRef<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordStart = useRef<number>(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [stopStream]);

  const disclosureLine = (() => {
    const parts: string[] = [];
    if (disclosure.positionHeld === true) parts.push("Position held");
    else if (disclosure.positionHeld === false) parts.push("No position");
    if (disclosure.compensationTied === true) parts.push("Compensation disclosed");
    else if (disclosure.compensationTied === false) parts.push("No compensation");
    return parts.length ? parts.join(" · ") : "Disclosure inherited from the report";
  })();

  const beginUpload = useCallback(
    async (file: Blob, durationSeconds: number, filename: string) => {
      setError(null);
      if (durationSeconds > MAX_VIDEO_DURATION_SECONDS + 0.5) {
        setError(`Videos must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter.`);
        setStep("choose");
        return;
      }
      setStep("uploading");
      setProgress(0);
      try {
        const res = await fetch("/api/creator/videos/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, title: reportTitle, durationSeconds: Math.round(durationSeconds) }),
        });
        const data = (await res.json()) as UploadSession & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not start the upload.");
        clipIdRef.current = data.clipId;

        await uploadToBunnyTus(
          file,
          data.upload,
          { title: reportTitle.slice(0, 200) || filename, filetype: file.type || "video/mp4" },
          (percent) => setProgress(percent),
        );

        setStep("processing");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        setStep("choose");
      }
    },
    [reportId, reportTitle],
  );

  const pollStatus = useCallback(() => {
    const clipId = clipIdRef.current;
    if (!clipId) return;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/creator/videos/${clipId}`, { cache: "no-store" });
        const data = (await res.json()) as {
          status: string;
          captionsReady: boolean;
          transcript: string;
        };
        if (data.status === "failed") {
          setError("Processing failed. The video may be too long or unreadable.");
          setStep("choose");
          return;
        }
        if (data.status === "ready") {
          setTranscript(data.transcript ?? "");
          setCaptionsReady(data.captionsReady);
          if (data.captionsReady || attempts > 15) {
            setStep("review");
            return;
          }
        }
      } catch {
        // keep polling
      }
      if (attempts > 60) {
        setError("Still processing. Check back from your reports in a few minutes.");
        setStep("choose");
        return;
      }
      pollTimer.current = setTimeout(tick, 4000);
    };
    void tick();
  }, []);

  // Kick off status polling once the upload finishes and we enter processing.
  useEffect(() => {
    if (step === "processing") pollStatus();
  }, [step, pollStatus]);

  const onFilePicked = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        void beginUpload(file, probe.duration || 0, file.name);
      };
      probe.onerror = () => {
        URL.revokeObjectURL(url);
        setError("Could not read that video file.");
      };
      probe.src = url;
    },
    [beginUpload],
  );

  const stopRecording = useCallback(() => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setStep("recording");
      setCountdown(MAX_VIDEO_DURATION_SECONDS);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        void videoPreviewRef.current.play().catch(() => undefined);
      }
      recordedChunks.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: pickMime() });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const elapsed = (Date.now() - recordStart.current) / 1000;
        const blob = new Blob(recordedChunks.current, { type: recorder.mimeType || "video/webm" });
        stopStream();
        void beginUpload(blob, elapsed, "recording.webm");
      };
      recordStart.current = Date.now();
      recorder.start();
      countdownTimer.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            stopRecording();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError("Camera or microphone access was denied.");
      setStep("choose");
    }
  }, [beginUpload, stopStream, stopRecording]);

  const publish = useCallback(async () => {
    const clipId = clipIdRef.current;
    if (!clipId) return;
    setPublishing(true);
    setError(null);
    setBlockingClaims([]);
    try {
      const res = await fetch(`/api/creator/videos/${clipId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = (await res.json()) as { error?: string; blockingClaims?: BlockingClaim[] };
      if (res.status === 422 && data.blockingClaims) {
        setBlockingClaims(data.blockingClaims);
        setError("Some spoken claims are unproven or contradicted.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Publish failed.");
      setStep("done");
      onPublished?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  }, [transcript, onPublished]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add a video"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4"
      onClick={onClose}
    >
      <div
        className="scroll-area max-h-[90vh] w-full max-w-lg overflow-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-text">Add a video</h2>
            <p className="mt-0.5 text-xs text-text-mute">
              A short teaser for “{reportTitle}”. Max {MAX_VIDEO_DURATION_SECONDS}s.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-ring rounded-[var(--radius-btn)] p-1 text-text-mute hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-btn)] border border-[var(--rust)]/40 bg-[var(--rust)]/8 px-3 py-2 text-sm text-[var(--rust)]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {step === "choose" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={startRecording}
                className="focus-ring flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface-2 px-4 py-4 text-left transition-colors hover:border-border-strong"
              >
                <Video size={20} className="shrink-0 text-text" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-text">Record now</span>
                  <span className="block text-xs text-text-mute">
                    Use your camera. Stops automatically at {MAX_VIDEO_DURATION_SECONDS}s.
                  </span>
                </span>
              </button>

              <label className="focus-within:ring-2 focus-within:ring-[var(--ink)] flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface-2 px-4 py-4 transition-colors hover:border-border-strong">
                <Upload size={20} className="shrink-0 text-text" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-text">Upload a file</span>
                  <span className="block text-xs text-text-mute">MP4, MOV, or WebM.</span>
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFilePicked(f);
                  }}
                />
              </label>
            </div>
          )}

          {step === "recording" && (
            <div className="flex flex-col gap-4">
              <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--ink)]">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={videoPreviewRef} muted playsInline className="aspect-video w-full object-cover" />
                <span className="num absolute right-2 top-2 flex items-center gap-1.5 rounded-[var(--r-tag)] bg-[var(--rust)] px-2 py-0.5 text-xs font-semibold text-[var(--paper)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--paper)]" />
                  {countdown}s
                </span>
              </div>
              <Button variant="primary" onClick={stopRecording} className="w-full">
                <Square size={16} aria-hidden /> Stop &amp; use recording
              </Button>
            </div>
          )}

          {step === "uploading" && (
            <div className="flex flex-col gap-3 py-4">
              <div className="flex items-center gap-2 text-sm text-text">
                <Loader2 size={16} className="animate-spin" aria-hidden /> Uploading… {progress}%
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-[var(--ink)] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Loader2 size={22} className="animate-spin text-text-mute" aria-hidden />
              <p className="text-sm font-medium text-text">Processing and transcribing…</p>
              <p className="text-xs text-text-mute">
                Bunny is encoding the video and generating captions. This usually takes under a minute.
              </p>
            </div>
          )}

          {step === "review" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[var(--radius-btn)] border border-border bg-surface-2 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                  <ShieldCheck size={13} aria-hidden /> Disclosure overlay (read-only)
                </div>
                <p className="mt-1 text-xs text-text-mute">{disclosureLine}</p>
              </div>

              <div>
                <label htmlFor="video-transcript" className="mb-1.5 block text-xs font-semibold text-text">
                  Captions / transcript {captionsReady ? "" : "(edit if needed)"}
                </label>
                <p className="mb-2 text-xs text-text-mute">
                  These captions ship with the video and are what the fact-checker reads. Correct any
                  errors before publishing.
                </p>
                <textarea
                  id="video-transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={6}
                  placeholder="Transcript text…"
                  className="focus-ring w-full resize-y rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-2 text-sm text-text"
                />
              </div>

              {blockingClaims.length > 0 && (
                <div className="rounded-[var(--radius-btn)] border border-[var(--rust)]/40 bg-[var(--rust)]/8 px-3 py-2">
                  <p className="text-xs font-semibold text-[var(--rust)]">
                    These spoken claims block publishing:
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {blockingClaims.map((c, i) => (
                      <li key={i} className="text-xs text-text">
                        <span className="font-mono uppercase text-[var(--rust)]">{c.verdict}</span> · {c.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                variant="primary"
                onClick={publish}
                disabled={publishing || !transcript.trim()}
                className="w-full"
              >
                {publishing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden /> Fact-checking &amp; publishing…
                  </>
                ) : (
                  "Fact-check & publish"
                )}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--verdigris)]/12 text-[var(--verdigris)]">
                <Check size={22} aria-hidden />
              </span>
              <p className="text-sm font-semibold text-text">Video published</p>
              <p className="text-xs text-text-mute">
                It is now attached to your report and will appear in the video-first Discover and Dispatch.
              </p>
              <Button variant="secondary" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function pickMime(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}
