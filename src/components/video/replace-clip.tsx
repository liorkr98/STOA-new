"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MAX_VIDEO_DURATION_SECONDS } from "@/lib/video/constants";
import { uploadComposeClip } from "@/lib/video/upload-clip";

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(probe.duration || 0);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that video file."));
    };
    probe.src = url;
  });
}

/**
 * A failed clip on a live publication cannot be swapped from Compose (the
 * video step is frozen as the record). This is the attach-again control on
 * the publication page itself.
 */
export function ReplaceClipControl({
  reportId,
  title,
}: {
  reportId: string;
  title: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const durationSeconds = await readDuration(file);
      if (durationSeconds > MAX_VIDEO_DURATION_SECONDS + 0.5) {
        throw new Error(`Videos must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter.`);
      }
      await uploadComposeClip({
        reportId,
        file,
        title,
        durationSeconds,
        onProgress: setProgress,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="num focus-ring rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,var(--paper)_40%,transparent)] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--paper)] disabled:opacity-50"
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={12} strokeWidth={1.6} className="animate-spin" />
            {progress > 0 ? `Uploading ${progress}%` : "Reading file"}
          </span>
        ) : (
          "Attach clip again"
        )}
      </button>
      {error ? <p className="max-w-[28ch] text-[0.75rem] leading-snug text-[var(--paper)]/80">{error}</p> : null}
    </div>
  );
}
