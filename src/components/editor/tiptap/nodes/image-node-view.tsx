"use client";

import { useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ImagePlus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/design/cn";
import { createClient } from "@/lib/supabase/client";

/**
 * imageNode view (A8). Uploads a body image to the report-images Supabase bucket
 * (browser client, same pattern as avatar/cover uploads and chart snapshots),
 * then stores the public URL in node attrs so it renders identically for a
 * reader. Width presets stand in for drag-resize; alt + caption are editable.
 *
 * NOTE (backend/Cursor): the `report-images` storage bucket must exist with
 * insert RLS scoped to the uploading user's folder ({user.id}/...).
 */

const BUCKET = "report-images";
const WIDTHS = [50, 75, 100] as const;

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function ImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const url = String(node.attrs.url ?? "");
  const alt = String(node.attrs.alt ?? "");
  const caption = String(node.attrs.caption ?? "");
  const widthPct = Number(node.attrs.widthPct ?? 100);

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in to upload");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/${nanoid(12)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || "image/png", upsert: true });
      if (upErr) {
        setError("Upload failed");
        return;
      }
      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      updateAttributes({ url: publicUrl });
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Reading mode: figure + caption only.
  if (!isEditable) {
    if (!url) return <NodeViewWrapper contentEditable={false} className="hidden" />;
    return (
      <NodeViewWrapper contentEditable={false} role="figure" className="fade-up my-4">
        <div className="mx-auto" style={{ width: `${widthPct}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="block w-full rounded-[var(--radius-card)] border border-border"
          />
          {caption && <p className="t-meta mt-1.5 text-center">{caption}</p>}
        </div>
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
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {url ? (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <span className="t-eyebrow flex-1">Image</span>
            <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-bg p-0.5">
              {WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onMouseDown={stop}
                  onClick={() => updateAttributes({ widthPct: w })}
                  className={cn(
                    "num rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors",
                    widthPct === w
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "text-text-mute hover:text-text",
                  )}
                >
                  {w}%
                </button>
              ))}
            </div>
            <button
              type="button"
              onMouseDown={stop}
              onClick={() => inputRef.current?.click()}
              className="h-7 rounded-[var(--radius-btn)] px-2 text-[11px] text-text-mute hover:bg-surface-2 focus-ring"
            >
              Replace
            </button>
            <button
              type="button"
              aria-label="Delete image"
              onMouseDown={stop}
              onClick={() => deleteNode()}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="p-3">
            <div className="mx-auto" style={{ width: `${widthPct}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={alt}
                className="block w-full rounded-[var(--radius-btn)] border border-border"
              />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <input
                value={caption}
                onChange={(e) => updateAttributes({ caption: e.target.value })}
                onMouseDown={stop}
                placeholder="Caption (optional)"
                className="w-full bg-transparent text-center text-sm text-text-mute focus:outline-none"
              />
              <input
                value={alt}
                onChange={(e) => updateAttributes({ alt: e.target.value })}
                onMouseDown={stop}
                placeholder="Alt text (accessibility)"
                className="t-meta w-full bg-transparent text-center text-[11px] focus:outline-none"
              />
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          onMouseDown={stop}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 px-4 py-12 text-text-mute hover:bg-surface-2 focus-ring disabled:opacity-60"
        >
          <ImagePlus size={22} className="text-text-faint" />
          <span className="text-sm">{uploading ? "Uploading..." : "Upload an image"}</span>
          {error && <span className="text-[11px] text-[var(--down)]">{error}</span>}
        </button>
      )}
    </NodeViewWrapper>
  );
}
