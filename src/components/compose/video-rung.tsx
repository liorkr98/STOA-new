"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Film, ImagePlus, Pause, Play, Type, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import {
  FRAME,
  MIN_EVENT,
  activeAt,
  clamp,
  emptyEdit,
  fmtTimecode,
  gridStyle,
  parseTimecode,
  sourceLabel,
  type GridPosition,
  type Overlay,
  type TextOverlay,
  type VideoEdit,
  type VisualOverlay,
  type VisualSource,
} from "@/lib/compose/overlays";

/**
 * The video rung of Compose: the video is the seed; call, cards and thesis
 * are optional modules below it. This rung holds the preview, thumbnail
 * creation and the mini editor: trim, text overlays and visual overlays on
 * two stacked tracks with a precise playhead. The preview is exactly what
 * will publish, because overlays burn permanently into the video.
 *
 * With a local file the stage plays the real video; without one (a fixture,
 * or before a file is chosen) it plays a poster with a running clock so the
 * timeline and overlays still behave.
 */

const uid = () => Math.random().toString(36).slice(2, 9);
const PX_PER_SEC_BASE = 8;

function Poster({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 opacity-40", className)}
      style={{
        background:
          "repeating-linear-gradient(118deg, color-mix(in srgb, var(--paper) 14%, transparent) 0 8px, transparent 8px 18px)",
      }}
    />
  );
}

/* ---------- the stage: video + live overlays ---------- */

function VisualBody({ source, className }: { source: VisualSource; className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden rounded-[6px] border border-white/20 bg-[color-mix(in_srgb,var(--paper)_92%,black)] text-[var(--ink)]", className)}>
      {source.type === "figure" || source.type === "upload" ? (
        source.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source.imageUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="num text-[10px] uppercase tracking-[0.14em] text-text-mute">{sourceLabel(source)}</span>
        )
      ) : (
        <div className="flex h-full w-full flex-col p-3">
          <span className="num text-[10px] uppercase tracking-[0.14em] text-text-mute">{sourceLabel(source)}</span>
          <svg viewBox="0 0 200 80" className="mt-2 h-full w-full" preserveAspectRatio="none" aria-hidden>
            <polyline points="0,60 30,55 60,62 90,40 120,44 150,25 180,30 200,18" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
            <line x1="0" y1="22" x2="200" y2="22" stroke="var(--brass)" strokeDasharray="3 3" strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  );
}

function Stage({
  src,
  time,
  overlays,
  playing,
  videoRef,
  onTogglePlay,
  faithful,
}: {
  src: string | null;
  time: number;
  overlays: Overlay[];
  playing: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  faithful: boolean;
}) {
  const active = activeAt(overlays, time);
  const cutaway = active.find((o): o is VisualOverlay => o.kind === "visual" && o.mode === "cutaway");
  const insets = active.filter((o): o is VisualOverlay => o.kind === "visual" && o.mode === "inset");
  const texts = active.filter((o): o is TextOverlay => o.kind === "text");
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--ink)] text-white">
      {src ? (
        <video ref={videoRef} src={src} className="absolute inset-0 h-full w-full object-contain" playsInline muted={false} />
      ) : (
        <Poster />
      )}
      {/* A cutaway hides the picture, never the sound. */}
      {cutaway ? (
        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--paper)_92%,black)]">
          <VisualBody source={cutaway.source} className="h-full w-full rounded-none border-0" />
          {!faithful ? (
            <span className="num absolute left-3 top-3 rounded bg-black/60 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white">
              Cutaway · audio continues
            </span>
          ) : null}
        </div>
      ) : null}
      {insets.map((o) => (
        <div key={o.id} className="absolute h-[42%] w-[46%]" style={gridStyle(o.position)}>
          <VisualBody source={o.source} className="h-full w-full" />
        </div>
      ))}
      {texts.map((o) => (
        <div
          key={o.id}
          className={cn(
            "absolute max-w-[80%] font-sans font-semibold leading-tight",
            cutaway ? "text-[var(--ink)]" : "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]",
            o.size === "sm" ? "text-[0.875rem]" : o.size === "md" ? "text-[1.25rem]" : "text-[1.75rem]",
          )}
          style={gridStyle(o.position)}
        >
          {o.text}
        </div>
      ))}
      {!faithful ? (
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="focus-ring absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] text-[var(--ink)]"
        >
          {playing ? <Pause size={14} fill="currentColor" strokeWidth={0} /> : <Play size={14} fill="currentColor" strokeWidth={0} className="ml-0.5" />}
        </button>
      ) : null}
      <span className="num absolute bottom-3 right-3 rounded bg-black/60 px-1.5 py-0.5 text-[10px]">{fmtTimecode(time)}</span>
    </div>
  );
}

/* ---------- thumbnail creation ---------- */

function ThumbnailPicker({
  src,
  edit,
  onChange,
}: {
  src: string | null;
  edit: VideoEdit;
  onChange: (t: VideoEdit["thumbnail"]) => void;
}) {
  const [frames, setFrames] = useState<{ time: number; url: string | null }[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const times = Array.from({ length: 8 }, (_, i) => Math.round(((i + 0.5) / 8) * edit.durationSeconds * 10) / 10);
    if (!src) {
      setFrames(times.map((t) => ({ time: t, url: null })));
      return;
    }
    let cancelled = false;
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.preload = "auto";
    const canvas = document.createElement("canvas");
    const out: { time: number; url: string | null }[] = [];
    const grab = (i: number) => {
      if (cancelled) return;
      if (i >= times.length) {
        setFrames(out);
        return;
      }
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        canvas.width = 160;
        canvas.height = Math.round((160 * video.videoHeight) / Math.max(1, video.videoWidth));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        out.push({ time: times[i], url: canvas.toDataURL("image/jpeg", 0.7) });
        grab(i + 1);
      };
      video.addEventListener("seeked", onSeeked);
      video.currentTime = Math.min(times[i], Math.max(0, video.duration - 0.05));
    };
    video.addEventListener("loadedmetadata", () => grab(0), { once: true });
    return () => {
      cancelled = true;
    };
  }, [src, edit.durationSeconds]);

  const chosen = edit.thumbnail;
  const chosenUrl =
    chosen?.type === "upload" ? chosen.url : chosen?.type === "frame" ? frames.find((f) => Math.abs(f.time - chosen.time) < 0.05)?.url ?? null : null;

  return (
    <section aria-label="Thumbnail" className="mt-6">
      <div className="flex items-baseline justify-between">
        <h3 className="t-eyebrow">Thumbnail</h3>
        <span className="num text-[10px] uppercase tracking-[0.12em] text-text-faint">This is what people click</span>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
        <div className="relative aspect-[4/5] w-[120px] overflow-hidden rounded-[var(--radius-btn)] border border-border bg-[var(--ink)]">
          {chosenUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chosenUrl} alt="Chosen thumbnail" className="h-full w-full object-cover" />
          ) : (
            <>
              <Poster />
              <span className="num absolute inset-x-0 bottom-2 text-center text-[10px] uppercase tracking-[0.12em] text-white/80">
                {chosen ? `Frame ${fmtTimecode(chosen.type === "frame" ? chosen.time : 0)}` : "None chosen"}
              </span>
            </>
          )}
        </div>
        <div className="min-w-0">
          <div className="num mb-1.5 text-[10px] uppercase tracking-[0.14em] text-text-mute">Pick a frame</div>
          <div className="scroll-area flex gap-1.5 overflow-x-auto pb-1">
            {frames.map((f) => (
              <button
                key={f.time}
                type="button"
                onClick={() => onChange({ type: "frame", time: f.time })}
                className={cn(
                  "focus-ring relative h-14 w-20 flex-none overflow-hidden rounded-[4px] border bg-[var(--ink)]",
                  chosen?.type === "frame" && Math.abs(chosen.time - f.time) < 0.05 ? "border-[var(--ink)] ring-2 ring-[var(--ink)]" : "border-border",
                )}
                aria-label={`Frame at ${fmtTimecode(f.time)}`}
              >
                {f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Poster />
                )}
                <span className="num absolute bottom-0.5 right-1 text-[10px] text-white/80">{fmtTimecode(f.time)}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onChange({ type: "upload", url: URL.createObjectURL(f) });
              }}
            />
            <Button variant="secondary" size="sm" onClick={() => uploadRef.current?.click()}>
              <ImagePlus size={14} /> Upload an image
            </Button>
            <span className="num text-[10px] uppercase tracking-[0.12em] text-text-faint">Shown at 4:5, as on Explore and the profile</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- the timeline ---------- */

type Drag =
  | { kind: "playhead" }
  | { kind: "move"; id: string; grabOffset: number }
  | { kind: "resize"; id: string; edge: "start" | "end" }
  | { kind: "trim"; edge: "start" | "end" };

function Timeline({
  edit,
  time,
  zoom,
  selectedId,
  onTime,
  onSelect,
  onEdit,
}: {
  edit: VideoEdit;
  time: number;
  zoom: number;
  selectedId: string | null;
  onTime: (t: number) => void;
  onSelect: (id: string | null) => void;
  onEdit: (e: VideoEdit) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const pxPerSec = PX_PER_SEC_BASE * zoom;
  const width = Math.max(1, edit.durationSeconds * pxPerSec);

  const timeAt = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return clamp((clientX - rect.left + el.scrollLeft) / pxPerSec, 0, edit.durationSeconds);
    },
    [pxPerSec, edit.durationSeconds],
  );

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const t = timeAt(e.clientX);
      if (drag.kind === "playhead") onTime(t);
      else if (drag.kind === "trim") {
        onEdit(
          drag.edge === "start"
            ? { ...edit, trimStart: clamp(t, 0, edit.trimEnd - MIN_EVENT) }
            : { ...edit, trimEnd: clamp(t, edit.trimStart + MIN_EVENT, edit.durationSeconds) },
        );
      } else {
        onEdit({
          ...edit,
          overlays: edit.overlays.map((o) => {
            if (o.id !== drag.id) return o;
            if (drag.kind === "move") {
              const len = o.end - o.start;
              const start = clamp(t - drag.grabOffset, 0, edit.durationSeconds - len);
              return { ...o, start, end: start + len };
            }
            return drag.edge === "start"
              ? { ...o, start: clamp(t, 0, o.end - MIN_EVENT) }
              : { ...o, end: clamp(t, o.start + MIN_EVENT, edit.durationSeconds) };
          }),
        });
      }
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, edit, onEdit, onTime, timeAt]);

  const markerStep = zoom >= 6 ? 1 : zoom >= 3 ? 2 : zoom >= 1.5 ? 5 : 10;
  const markers: number[] = [];
  for (let t = 0; t <= edit.durationSeconds; t += markerStep) markers.push(t);

  const track = (label: string, kind: Overlay["kind"]) => (
    <div className="relative h-11 border-t border-border" role="list" aria-label={`${label} track`}>
      <span className="num absolute left-1 top-1 z-10 text-[10px] uppercase tracking-[0.16em] text-text-faint">{label}</span>
      {edit.overlays
        .filter((o) => o.kind === kind)
        .map((o) => (
          <div
            key={o.id}
            role="listitem"
            className={cn(
              "absolute top-2 h-7 cursor-grab select-none rounded-[4px] border text-[10px] leading-7",
              kind === "text" ? "border-[var(--plum)] bg-[color-mix(in_srgb,var(--plum)_14%,transparent)]" : "border-[var(--brass)] bg-[color-mix(in_srgb,var(--brass)_14%,transparent)]",
              selectedId === o.id && "ring-2 ring-[var(--ink)]",
            )}
            style={{ left: o.start * pxPerSec, width: Math.max(8, (o.end - o.start) * pxPerSec) }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(o.id);
              setDrag({ kind: "move", id: o.id, grabOffset: timeAt(e.clientX) - o.start });
            }}
          >
            <span className="block truncate px-2 text-text">{o.kind === "text" ? o.text || "Text" : sourceLabel(o.source)}</span>
            <span
              className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize"
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect(o.id);
                setDrag({ kind: "resize", id: o.id, edge: "start" });
              }}
            />
            <span
              className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect(o.id);
                setDrag({ kind: "resize", id: o.id, edge: "end" });
              }}
            />
          </div>
        ))}
    </div>
  );

  return (
    <div
      ref={ref}
      className="scroll-area relative mt-3 overflow-x-auto rounded-[var(--radius-btn)] border border-border bg-surface"
      onPointerDown={(e) => {
        onSelect(null);
        onTime(timeAt(e.clientX));
        setDrag({ kind: "playhead" });
      }}
    >
      <div className="relative" style={{ width }}>
        {/* Time markers */}
        <div className="relative h-5">
          {markers.map((t) => (
            <span key={t} className="num absolute top-1 text-[10px] text-text-faint" style={{ left: t * pxPerSec + 2 }}>
              {fmtTimecode(t).replace(/\.0$/, "")}
            </span>
          ))}
        </div>
        {track("Text", "text")}
        {track("Visual", "visual")}
        {/* Trimmed regions */}
        <div className="pointer-events-none absolute inset-y-0 left-0 bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]" style={{ width: edit.trimStart * pxPerSec }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]" style={{ width: (edit.durationSeconds - edit.trimEnd) * pxPerSec }} />
        {/* Trim handles */}
        {(["start", "end"] as const).map((edge) => (
          <button
            key={edge}
            type="button"
            aria-label={edge === "start" ? "Trim start" : "Trim end"}
            className="absolute top-0 z-20 h-full w-2.5 cursor-ew-resize rounded-sm bg-[var(--ink)]"
            style={{ left: (edge === "start" ? edit.trimStart : edit.trimEnd) * pxPerSec - (edge === "start" ? 0 : 10) }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setDrag({ kind: "trim", edge });
            }}
          />
        ))}
        {/* Playhead */}
        <div className="pointer-events-none absolute inset-y-0 z-30 w-px bg-[var(--rust)]" style={{ left: time * pxPerSec }}>
          <span className="absolute -left-1.5 -top-0.5 h-3 w-3 rounded-full bg-[var(--rust)]" />
        </div>
      </div>
    </div>
  );
}

/* ---------- event settings ---------- */

function GridPicker({ value, onChange }: { value: GridPosition; onChange: (p: GridPosition) => void }) {
  return (
    <div className="grid w-[72px] grid-cols-3 gap-1" role="radiogroup" aria-label="Position">
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as GridPosition[]).map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          aria-label={`Position ${p}`}
          onClick={() => onChange(p)}
          className={cn("focus-ring h-5 w-5 rounded-[3px] border", value === p ? "border-[var(--ink)] bg-[var(--ink)]" : "border-border bg-surface")}
        />
      ))}
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (t: number) => void }) {
  const [draft, setDraft] = useState(fmtTimecode(value));
  useEffect(() => setDraft(fmtTimecode(value)), [value]);
  return (
    <label className="flex items-center gap-1.5">
      <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">{label}</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const t = parseTimecode(draft);
          if (t != null) onChange(t);
          else setDraft(fmtTimecode(value));
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="num w-16 rounded-[4px] border border-border bg-surface px-1.5 py-0.5 text-[11px] text-text focus-ring"
      />
    </label>
  );
}

function EventSettings({ overlay, edit, onEdit, onRemove }: { overlay: Overlay; edit: VideoEdit; onEdit: (e: VideoEdit) => void; onRemove: () => void }) {
  const update = (patch: Partial<Overlay>) =>
    onEdit({ ...edit, overlays: edit.overlays.map((o) => (o.id === overlay.id ? ({ ...o, ...patch } as Overlay) : o)) });
  const setStart = (t: number) => update({ start: clamp(t, 0, overlay.end - MIN_EVENT) });
  const setEnd = (t: number) => update({ end: clamp(t, overlay.start + MIN_EVENT, edit.durationSeconds) });

  return (
    <div className="mt-3 rounded-[var(--radius-btn)] border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="num text-[10px] uppercase tracking-[0.16em] text-text-mute">{overlay.kind === "text" ? "Text overlay" : "Visual overlay"}</span>
        <div className="flex items-center gap-3">
          <TimeField label="In" value={overlay.start} onChange={setStart} />
          <TimeField label="Out" value={overlay.end} onChange={setEnd} />
          <button type="button" onClick={onRemove} className="num text-[10px] uppercase tracking-[0.12em] text-[var(--rust)] focus-ring rounded">
            Remove
          </button>
        </div>
      </div>

      {overlay.kind === "text" ? (
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            value={overlay.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Caption text"
            className="rounded-[4px] border border-border bg-bg px-2 py-1.5 text-sm text-text focus-ring"
          />
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Size">
            {(["sm", "md", "lg"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={overlay.size === s}
                onClick={() => update({ size: s })}
                className={cn("focus-ring rounded-[4px] border px-2 py-1 text-[11px] uppercase", overlay.size === s ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-border text-text-mute")}
              >
                {s}
              </button>
            ))}
          </div>
          <GridPicker value={overlay.position} onChange={(p) => update({ position: p })} />
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div>
            <div className="num mb-1 text-[10px] uppercase tracking-[0.14em] text-text-faint">Source</div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { type: "card", label: "Price chart · entry & target" },
                  { type: "card", label: "Peer comparison" },
                  { type: "card", label: "Key stats" },
                  { type: "figure", label: "Figure from the thesis", imageUrl: null },
                  { type: "chart", ticker: "NVDA" },
                  { type: "upload", label: "Uploaded image", imageUrl: null },
                ] as VisualSource[]
              ).map((s, i) => {
                const on = sourceLabel(overlay.source) === sourceLabel(s);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => update({ source: s })}
                    className={cn("focus-ring rounded-[4px] border px-2 py-1 text-[11px]", on ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-border text-text-mute")}
                  >
                    {sourceLabel(s)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="num mb-1 text-[10px] uppercase tracking-[0.14em] text-text-faint">Display</div>
            <div className="flex flex-col gap-1" role="radiogroup" aria-label="Display mode">
              {(["cutaway", "inset"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={overlay.mode === m}
                  onClick={() => update({ mode: m })}
                  className={cn("focus-ring rounded-[4px] border px-2 py-1 text-left text-[11px] uppercase tracking-[0.06em]", overlay.mode === m ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-border text-text-mute")}
                >
                  {m === "cutaway" ? "Full-frame cutaway" : "Inset"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="num mb-1 text-[10px] uppercase tracking-[0.14em] text-text-faint">Position (inset)</div>
            <GridPicker value={overlay.position} onChange={(p) => update({ position: p })} />
          </div>
        </div>
      )}
      <p className="num mt-3 text-[10px] uppercase tracking-[0.12em] text-text-faint">
        {overlay.kind === "visual" ? "A cutaway hides the picture. Your audio never stops." : "Duration comes from the block's width on the timeline."}
      </p>
    </div>
  );
}

/* ---------- the rung ---------- */

export function VideoRung({
  initial,
  demoDurationSeconds = 90,
  onChange,
}: {
  initial?: VideoEdit;
  /** Duration used for the poster stage when no file is loaded. */
  demoDurationSeconds?: number;
  onChange?: (edit: VideoEdit) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [edit, setEditState] = useState<VideoEdit>(initial ?? emptyEdit(demoDurationSeconds));
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [faithful, setFaithful] = useState(false);
  const [timecodeDraft, setTimecodeDraft] = useState("0:00.0");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timelineWrap = useRef<HTMLDivElement>(null);

  const setEdit = useCallback(
    (e: VideoEdit) => {
      setEditState(e);
      onChange?.(e);
    },
    [onChange],
  );

  useEffect(() => setTimecodeDraft(fmtTimecode(time)), [time]);

  // Live preview: the real video follows the playhead; the poster stage runs a clock.
  useEffect(() => {
    const v = videoRef.current;
    if (v && Math.abs(v.currentTime - time) > 0.08 && !playing) v.currentTime = time;
  }, [time, playing]);
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      if (playing) void v.play().catch(() => setPlaying(false));
      else v.pause();
    }
  }, [playing, src]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const v = videoRef.current;
      if (v && src) {
        setTime(v.currentTime);
        if (v.currentTime >= edit.trimEnd || v.ended) setPlaying(false);
      } else {
        const dt = (now - last) / 1000;
        last = now;
        setTime((t) => {
          const n = t + dt;
          if (n >= edit.trimEnd) {
            setPlaying(false);
            return edit.trimEnd;
          }
          return n;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, src, edit.trimEnd]);

  const jump = (t: number) => setTime(clamp(t, 0, edit.durationSeconds));
  const step = (frames: number) => jump(time + frames * FRAME);

  const addOverlay = (kind: Overlay["kind"]) => {
    const start = clamp(time, 0, edit.durationSeconds - 3);
    const base = { id: uid(), start, end: Math.min(edit.durationSeconds, start + 3) };
    const o: Overlay =
      kind === "text"
        ? { ...base, kind: "text", text: "", position: 8, size: "md" }
        : { ...base, kind: "visual", source: { type: "card", label: "Price chart · entry & target" }, mode: "inset", position: 3 };
    setEdit({ ...edit, overlays: [...edit.overlays, o] });
    setSelectedId(o.id);
  };

  const selected = useMemo(() => edit.overlays.find((o) => o.id === selectedId) ?? null, [edit.overlays, selectedId]);

  return (
    <section aria-label="Video" className="mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="t-eyebrow">Video</p>
          <p className="mt-1 text-[13px] text-text-mute">The video is the seed. Call, cards and thesis are optional below.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const url = URL.createObjectURL(f);
              setSrc(url);
              const probe = document.createElement("video");
              probe.preload = "metadata";
              probe.src = url;
              probe.addEventListener("loadedmetadata", () => {
                const d = Number.isFinite(probe.duration) ? probe.duration : demoDurationSeconds;
                setEdit({ ...emptyEdit(d), thumbnail: null });
                setTime(0);
              });
            }}
          />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> {src ? "Replace video" : "Choose a video"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Stage src={src} time={time} overlays={edit.overlays} playing={playing} videoRef={videoRef} onTogglePlay={() => setPlaying((p) => !p)} faithful={faithful} />
        {!src ? (
          <p className="num mt-2 text-[10px] uppercase tracking-[0.12em] text-text-faint">
            No video loaded · the stage runs a {fmtTimecode(edit.durationSeconds).replace(/\.0$/, "")} clock so overlays can be placed
          </p>
        ) : null}
      </div>

      <ThumbnailPicker src={src} edit={edit} onChange={(t) => setEdit({ ...edit, thumbnail: t })} />

      {/* The editor */}
      <div className="mt-6" ref={timelineWrap}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="t-eyebrow">Editor</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPlaying((p) => !p)} className="rail-arrow focus-ring" aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button type="button" onClick={() => step(-1)} className="rail-arrow focus-ring" aria-label="Back one frame">
              <ChevronLeft size={14} />
            </button>
            <input
              aria-label="Current time"
              value={timecodeDraft}
              onChange={(e) => setTimecodeDraft(e.target.value)}
              onBlur={() => {
                const t = parseTimecode(timecodeDraft);
                if (t != null) jump(t);
                else setTimecodeDraft(fmtTimecode(time));
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="num w-[68px] rounded-[4px] border border-border bg-bg px-1.5 py-1 text-center text-[12px] text-text focus-ring"
            />
            <button type="button" onClick={() => step(1)} className="rail-arrow focus-ring" aria-label="Forward one frame">
              <ChevronRight size={14} />
            </button>
            <span className="num text-[10px] text-text-faint">/ {fmtTimecode(edit.durationSeconds)}</span>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <button type="button" onClick={() => setZoom((z) => Math.max(1, z / 1.5))} className="rail-arrow focus-ring" aria-label="Zoom out">
              <ZoomOut size={13} />
            </button>
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Timeline zoom"
              className="w-20 accent-[var(--ink)]"
            />
            <button type="button" onClick={() => setZoom((z) => Math.min(8, z * 1.5))} className="rail-arrow focus-ring" aria-label="Zoom in">
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => addOverlay("text")}>
            <Type size={14} /> Add text overlay
          </Button>
          <Button variant="secondary" size="sm" onClick={() => addOverlay("visual")}>
            <Film size={14} /> Add visual overlay
          </Button>
          <span className="num ml-auto text-[10px] uppercase tracking-[0.12em] text-text-faint">
            Trim {fmtTimecode(edit.trimStart)} → {fmtTimecode(edit.trimEnd)} · ←/→ step a frame when the timeline has focus
          </span>
        </div>

        <div
          tabIndex={0}
          role="application"
          aria-label="Timeline"
          className="focus-ring rounded-[var(--radius-btn)]"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              step(e.shiftKey ? -10 : -1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              step(e.shiftKey ? 10 : 1);
            } else if (e.key === " ") {
              e.preventDefault();
              setPlaying((p) => !p);
            } else if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
              setEdit({ ...edit, overlays: edit.overlays.filter((o) => o.id !== selectedId) });
              setSelectedId(null);
            }
          }}
        >
          <Timeline edit={edit} time={time} zoom={zoom} selectedId={selectedId} onTime={jump} onSelect={setSelectedId} onEdit={setEdit} />
        </div>

        {selected ? (
          <EventSettings
            overlay={selected}
            edit={edit}
            onEdit={setEdit}
            onRemove={() => {
              setEdit({ ...edit, overlays: edit.overlays.filter((o) => o.id !== selected.id) });
              setSelectedId(null);
            }}
          />
        ) : null}
      </div>

      {/* Faithful preview */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <Button variant={faithful ? "primary" : "secondary"} size="sm" onClick={() => setFaithful((f) => !f)}>
            {faithful ? "Back to editing" : "Preview with overlays"}
          </Button>
          <p className="num mt-2 text-[10px] uppercase tracking-[0.12em] text-text-faint">
            Plays exactly as it will publish · overlays are permanent once published
          </p>
        </div>
        <p className="num max-w-[38ch] text-right text-[10px] uppercase leading-relaxed tracking-[0.12em] text-text-faint">
          Burning overlays into the video needs a processing service that does not exist yet. The editor is real; publishing with overlays is not wired.
        </p>
      </div>
    </section>
  );
}
