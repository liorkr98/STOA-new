"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Film, Lock, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * videoNode view (Part D / A12). Editor: direct upload to the provider, then the
 * webhook flips the asset ready. Reader: asks /api/video/token for a signed
 * iframe src -- 403 renders the locked tease (blurred poster + upgrade chip),
 * which is the per-block gating UI (Part C).
 */

type PlayState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; iframeSrc: string }
  | { kind: "locked"; reason: string }
  | { kind: "processing" }
  | { kind: "error"; message: string };

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function aspectPadding(ratio: string): string {
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return "56.25%";
  return `${(h / w) * 100}%`;
}

export function VideoNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const assetId = node.attrs.assetId ? String(node.attrs.assetId) : null;
  const caption = String(node.attrs.caption ?? "");
  const posterUrl = node.attrs.posterUrl ? String(node.attrs.posterUrl) : null;
  const aspectRatio = String(node.attrs.aspectRatio ?? "16:9");
  const minPlanRank = Number(node.attrs.minPlanRank ?? 0);

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [play, setPlay] = useState<PlayState>({ kind: assetId ? "loading" : "idle" });

  const fetchToken = useCallback(async () => {
    if (!assetId) return;
    setPlay({ kind: "loading" });
    try {
      const res = await fetch(`/api/video/token?assetId=${assetId}&minRank=${minPlanRank}`);
      if (res.status === 403) {
        setPlay({ kind: "locked", reason: minPlanRank > 0 ? "Higher tier required" : "Subscribers only" });
        return;
      }
      if (res.status === 409) {
        setPlay({ kind: "processing" });
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setPlay({ kind: "error", message: body?.error ?? "Video unavailable" });
        return;
      }
      const body = (await res.json()) as { iframeSrc: string; poster?: string | null };
      if (body.poster && body.poster !== posterUrl && isEditable) {
        updateAttributes({ posterUrl: body.poster });
      }
      setPlay({ kind: "ready", iframeSrc: body.iframeSrc });
    } catch {
      setPlay({ kind: "error", message: "Video unavailable" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, minPlanRank]);

  useEffect(() => {
    if (assetId) void fetchToken();
  }, [assetId, fetchToken]);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/video/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setUploadError(body?.error ?? "Upload unavailable");
        return;
      }
      const { assetId: newId, uploadUrl } = (await res.json()) as {
        assetId: string;
        uploadUrl: string;
      };
      const form = new FormData();
      form.append("file", file);
      const up = await fetch(uploadUrl, { method: "POST", body: form });
      if (!up.ok) {
        setUploadError("Upload failed");
        return;
      }
      updateAttributes({ assetId: newId });
      setPlay({ kind: "processing" });
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const frame = (
    <div className="relative w-full overflow-hidden rounded-[var(--radius-btn)] bg-[var(--ink)]" style={{ paddingBottom: aspectPadding(aspectRatio) }}>
      {play.kind === "ready" ? (
        <iframe
          src={play.iframeSrc}
          allow="accelerometer; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          title={caption || "Video"}
        />
      ) : play.kind === "locked" ? (
        <div className="absolute inset-0">
          {posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterUrl} alt="" className="h-full w-full object-cover opacity-40 blur-[6px]" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-btn)] bg-[var(--paper)]/90 text-[var(--ink)]">
              <Lock size={17} />
            </span>
            <span className="rounded-[var(--radius-tag)] bg-[var(--paper)]/90 px-2.5 py-1 text-[12px] font-medium text-[var(--ink)]">
              {play.reason} - upgrade to watch
            </span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-[var(--paper)]/70">
            {play.kind === "processing"
              ? "Processing video..."
              : play.kind === "loading"
                ? "Loading..."
                : play.kind === "error"
                  ? play.message
                  : ""}
          </span>
        </div>
      )}
    </div>
  );

  // Reading mode
  if (!isEditable) {
    if (!assetId) return <NodeViewWrapper contentEditable={false} className="hidden" />;
    return (
      <NodeViewWrapper contentEditable={false} role="figure" className="fade-up my-4">
        {frame}
        {caption && <p className="t-meta mt-1.5 text-center">{caption}</p>}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
      onMouseDown={stop}
      onClick={stop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Film size={14} className="text-text-faint" />
        <span className="t-eyebrow flex-1">Video</span>
        <label className="flex items-center gap-1.5 text-[11px] text-text-mute">
          Min tier rank
          <input
            type="number"
            min={0}
            value={minPlanRank}
            onChange={(e) => updateAttributes({ minPlanRank: Math.max(0, Number(e.target.value) || 0) })}
            onMouseDown={stop}
            className="num h-7 w-14 rounded-[var(--radius-btn)] border border-border bg-bg px-1.5 text-right text-sm focus-ring"
          />
        </label>
        {assetId && (
          <button
            type="button"
            onMouseDown={stop}
            onClick={() => inputRef.current?.click()}
            className="h-7 rounded-[var(--radius-btn)] px-2 text-[11px] text-text-mute hover:bg-surface-2 focus-ring"
          >
            Replace
          </button>
        )}
        <button
          type="button"
          aria-label="Delete video"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="p-3">
        {assetId ? (
          <>
            {frame}
            <input
              value={caption}
              onChange={(e) => updateAttributes({ caption: e.target.value })}
              onMouseDown={stop}
              placeholder="Caption (optional)"
              className="mt-2 w-full bg-transparent text-center text-sm text-text-mute focus:outline-none"
            />
            {play.kind === "processing" && (
              <button
                type="button"
                onMouseDown={stop}
                onClick={() => void fetchToken()}
                className="mx-auto mt-1 block text-[11px] text-text-faint hover:text-text focus-ring"
              >
                Check again
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onMouseDown={stop}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-dashed border-border px-4 py-12 text-text-mute hover:bg-surface-2 focus-ring disabled:opacity-60"
          >
            <Upload size={22} className="text-text-faint" />
            <span className="text-sm">{uploading ? "Uploading..." : "Upload a video"}</span>
            {uploadError && <span className="text-[11px] text-[var(--down)]">{uploadError}</span>}
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}
