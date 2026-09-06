"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, ImagePlus, Layers, Pause, Play, Sparkles, TrendingUp, Type, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { OverlayChartFields, OverlayVisualBody, OverlayVisualizeFields } from "@/components/compose/overlay-visual";
import { isCardDrag, readCardDrag } from "@/lib/compose/drag";
import { cardName, type DraftCard } from "@/lib/compose/cards";
import {
  FRAME,
  INSET_MAX_SIZE,
  INSET_MIN_SIZE,
  MIN_EVENT,
  OVERLAY_MIN_OPACITY,
  activeAt,
  clamp,
  emptyEdit,
  fmtTimecode,
  gridStyle,
  insetBox,
  insetSize,
  overlayOpacity,
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
 * The video rung of Compose: choose a clip, then trim it, put things on it,
 * and pick its cover.
 *
 * Built the way the editors analysts already use are built. CapCut,
 * Instagram's Reels editor, TikTok's editor and Descript are all made for
 * people who do not think of themselves as editors, and they agree on the
 * shape: one picture above one timeline; trim by dragging the ends of the
 * clip itself; anything placed on the video is placed by dragging it on the
 * picture and timed by dragging the ends of its bar under the filmstrip;
 * and the controls for a thing appear only while that thing is selected.
 * At rest there is a play button, a strip of frames, and a row of things
 * you can add.
 *
 * What the old rung had, and this does not: a second track, a playhead
 * transport with frame stepping, a zoom slider, a numeric event settings
 * panel that was always open, and three separate "add overlay" buttons that
 * each opened the same panel. Those are a professional tool's mental model,
 * and the person here wants to trim the start and show a chart for three
 * seconds.
 *
 * What it keeps, all of it: trim, text overlays, visual overlays with the
 * cutaway and inset modes, dragging a card from the tray onto the timeline,
 * the faithful preview, and the promise that the preview is exactly what
 * publishes, because overlays burn permanently into the video.
 *
 * With a local file the stage plays the real video; without one (a fixture,
 * or a clip that already lives on the server) it plays a poster with a
 * running clock so the timeline and overlays still behave.
 */

const uid = () => Math.random().toString(36).slice(2, 9);
const STRIP_FRAMES = 12;

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

/* ---------- frames off the clip, shared by the filmstrip and the cover ---------- */

type Frame = { time: number; url: string | null };

function useFrames(src: string | null, durationSeconds: number, count: number): Frame[] {
  const times = useMemo(
    () => Array.from({ length: count }, (_, i) => Math.round(((i + 0.5) / count) * durationSeconds * 10) / 10),
    [count, durationSeconds],
  );
  const placeholder = useMemo(() => times.map((t) => ({ time: t, url: null })), [times]);
  const [grabbed, setGrabbed] = useState<{ src: string; frames: Frame[] } | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.preload = "auto";
    const canvas = document.createElement("canvas");
    const out: Frame[] = [];
    const grab = (i: number) => {
      if (cancelled) return;
      if (i >= times.length) {
        setGrabbed({ src, frames: out });
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
  }, [src, times]);

  return src && grabbed?.src === src ? grabbed.frames : placeholder;
}

/* ---------- the stage: the picture, and everything placed on it ---------- */

/** Which of the nine positions a point on the stage is closest to. */
function positionAt(stage: HTMLElement, clientX: number, clientY: number): GridPosition {
  const r = stage.getBoundingClientRect();
  const x = clamp((clientX - r.left) / Math.max(1, r.width), 0, 0.999);
  const y = clamp((clientY - r.top) / Math.max(1, r.height), 0, 0.999);
  const col = Math.floor(x * 3);
  const row = Math.floor(y * 3);
  return (row * 3 + col + 1) as GridPosition;
}

/** Text that is typed on the picture itself, where it will appear. */
function EditableText({
  value,
  editing,
  onChange,
  className,
}: {
  value: string;
  editing: boolean;
  onChange: (text: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // The span owns its own text while it has focus, so typing never fights a
  // re-render; it is brought back in line with the value whenever it does
  // not.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== value) el.textContent = value;
  }, [value]);
  return (
    <span
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      role={editing ? "textbox" : undefined}
      aria-label={editing ? "Overlay text" : undefined}
      data-placeholder="Type here"
      onInput={(e) => onChange(e.currentTarget.textContent ?? "")}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        e.stopPropagation();
      }}
      className={cn(
        "block outline-none empty:before:opacity-60 empty:before:content-[attr(data-placeholder)]",
        editing && "cursor-text",
        className,
      )}
    />
  );
}

/**
 * The corner you drag to resize an inset. It sits on the corner farthest
 * from the anchor the nine-point grid pins the box to, so dragging it
 * outward grows the box away from where it is pinned rather than pulling it
 * off its spot; a box anchored to the centre column grows both ways.
 */
function ResizeHandle({
  overlay,
  stageRef,
  onSize,
}: {
  overlay: VisualOverlay;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onSize: (size: number) => void;
}) {
  const dragRef = useRef<{ x: number; size: number } | null>(null);
  const col = (overlay.position - 1) % 3;
  const row = Math.floor((overlay.position - 1) / 3);
  const right = col !== 2;
  const bottom = row !== 2;
  const sign = right ? 1 : -1;
  const factor = col === 1 ? 2 : 1;
  return (
    <button
      type="button"
      aria-label="Resize"
      title="Drag to resize"
      className={cn(
        "absolute z-10 h-4 w-4 touch-none rounded-[3px] border-2 border-[var(--paper)] bg-[var(--brass)] shadow-[0_1px_3px_rgba(0,0,0,0.5)] focus-ring",
        right ? "-right-2" : "-left-2",
        bottom ? "-bottom-2" : "-top-2",
        right === bottom ? "cursor-nwse-resize" : "cursor-nesw-resize",
      )}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { x: e.clientX, size: insetSize(overlay) };
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        const stage = stageRef.current;
        if (!d || !stage) return;
        e.preventDefault();
        e.stopPropagation();
        const w = stage.getBoundingClientRect().width || 1;
        onSize(clamp(d.size + ((e.clientX - d.x) * sign * factor) / w, INSET_MIN_SIZE, INSET_MAX_SIZE));
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        dragRef.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={(e) => {
        dragRef.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
    />
  );
}

function Stage({
  src,
  time,
  edit,
  cards,
  playing,
  videoRef,
  onTogglePlay,
  faithful,
  ticker,
  selectedId,
  onSelect,
  onMove,
  onResize,
  onText,
}: {
  src: string | null;
  time: number;
  edit: VideoEdit;
  cards: DraftCard[];
  playing: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  faithful: boolean;
  ticker?: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, position: GridPosition) => void;
  onResize: (id: string, size: number) => void;
  onText: (id: string, text: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pressRef = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  // The full-frame card is scaled with the picture, so a card that reads at
  // 13px in the toolbox reads like a slide on the stage and burns in at the
  // same proportion whatever size the stage happened to be on screen.
  const [stageWidth, setStageWidth] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fullFrameZoom = clamp(stageWidth / 520, 1, 2);

  const active = activeAt(edit.overlays, time);
  const cutaway = active.find((o): o is VisualOverlay => o.kind === "visual" && o.mode === "cutaway");
  // A full-frame visual owns the picture while it shows. Insets and text
  // active at the same moment used to be painted over it, which is the
  // collision the mode existed to avoid, so they wait until it is gone.
  const insets = cutaway ? [] : active.filter((o): o is VisualOverlay => o.kind === "visual" && o.mode === "inset");
  const texts = cutaway ? [] : active.filter((o): o is TextOverlay => o.kind === "text");

  /**
   * Press and release selects; press, move and release places. The
   * threshold is what lets a text overlay be both draggable and typable.
   */
  const pressDown = useCallback(
    (id: string, e: React.PointerEvent<HTMLElement>) => {
      if (faithful) return;
      e.stopPropagation();
      pressRef.current = { id, x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [faithful],
  );
  const pressMove = useCallback(
    (id: string, movable: boolean, e: React.PointerEvent<HTMLElement>) => {
      const p = pressRef.current;
      if (!p || p.id !== id || !movable) return;
      if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 4) return;
      if (!p.moved) {
        p.moved = true;
        setDragging(true);
        onSelect(id);
        (document.activeElement as HTMLElement | null)?.blur();
      }
      e.preventDefault();
      const stage = stageRef.current;
      if (stage) onMove(id, positionAt(stage, e.clientX, e.clientY));
    },
    [onMove, onSelect],
  );
  const pressUp = useCallback(
    (id: string, e: React.PointerEvent<HTMLElement>) => {
      const p = pressRef.current;
      pressRef.current = null;
      setDragging(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      if (p && !p.moved) onSelect(id);
    },
    [onSelect],
  );
  const pressHandlers = (id: string, movable: boolean) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => pressDown(id, e),
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => pressMove(id, movable, e),
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => pressUp(id, e),
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => pressUp(id, e),
  });

  const ring = (id: string) =>
    !faithful && selectedId === id && "outline outline-2 outline-offset-2 outline-[var(--brass)]";

  return (
    <div
      ref={stageRef}
      className="relative aspect-video w-full select-none overflow-hidden rounded-[var(--radius-card)] bg-[var(--ink)] text-white"
      onPointerDown={() => !faithful && onSelect(null)}
    >
      {src ? (
        <video ref={videoRef} src={src} className="absolute inset-0 h-full w-full object-contain" playsInline muted={false} />
      ) : (
        <Poster />
      )}

      {/* Full frame: the visual fills the picture, the video dimmed behind
          it and the sound carrying on. It used to replace the picture with
          a sheet of paper and then let insets and text paint over the top;
          now the picture stays, the card sits in it with a margin, scaled
          to the stage, and nothing else shows while it does. */}
      {cutaway ? (
        <div
          className={cn("absolute inset-0 cursor-pointer", ring(cutaway.id))}
          {...pressHandlers(cutaway.id, false)}
        >
          <div aria-hidden className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_62%,transparent)]" />
          <div className="absolute inset-[4%] flex items-center justify-center">
            <div
              className="flex items-center justify-center"
              style={{
                zoom: fullFrameZoom,
                width: `${100 / fullFrameZoom}%`,
                height: `${100 / fullFrameZoom}%`,
                opacity: overlayOpacity(cutaway),
              }}
            >
              <OverlayVisualBody
                source={cutaway.source}
                cards={cards}
                ticker={ticker}
                className="h-full w-full shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
          {!faithful ? (
            <span className="num absolute left-3 top-3 rounded bg-black/60 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white">
              Full frame · audio continues · other overlays wait
            </span>
          ) : null}
        </div>
      ) : null}

      {insets.map((o) => (
        <div
          key={o.id}
          className={cn("absolute touch-none", !faithful && "cursor-grab", dragging && selectedId === o.id && "cursor-grabbing", ring(o.id))}
          style={{ ...gridStyle(o.position), ...insetBox(o) }}
          {...pressHandlers(o.id, true)}
        >
          <div className="h-full w-full" style={{ opacity: overlayOpacity(o) }}>
            <OverlayVisualBody source={o.source} cards={cards} ticker={ticker} className="h-full w-full" />
          </div>
          {!faithful && selectedId === o.id ? (
            <ResizeHandle overlay={o} stageRef={stageRef} onSize={(size) => onResize(o.id, size)} />
          ) : null}
        </div>
      ))}

      {texts.map((o) => (
        <div
          key={o.id}
          className={cn(
            "absolute max-w-[80%] touch-none font-sans font-semibold leading-tight",
            cutaway ? "text-[var(--ink)]" : "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]",
            o.size === "sm" ? "text-[0.875rem]" : o.size === "md" ? "text-[1.25rem]" : "text-[1.75rem]",
            !faithful && selectedId !== o.id && "cursor-grab",
            ring(o.id),
          )}
          style={gridStyle(o.position)}
          {...pressHandlers(o.id, true)}
        >
          <EditableText
            value={o.text}
            editing={!faithful && selectedId === o.id}
            onChange={(t) => onText(o.id, t)}
            className="min-w-[2ch] px-1"
          />
        </div>
      ))}

      {/* The nine places a thing can sit, shown only while one is being moved. */}
      {dragging ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="border border-white/25" />
          ))}
        </div>
      ) : null}

      {!faithful ? (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
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

/* ---------- the timeline: one strip, the things on it, and a playhead ---------- */

type Drag =
  | { kind: "scrub" }
  | { kind: "trim"; edge: "start" | "end" }
  | { kind: "move"; id: string; grabOffset: number }
  | { kind: "resize"; id: string; edge: "start" | "end" };

const HANDLE = 12;
const LANE = 26;

/** One end of the kept region: the thick bracket you drag inward to trim. */
function TrimHandle({
  edge,
  left,
  onPress,
}: {
  edge: "start" | "end";
  left: number;
  onPress: (e: React.PointerEvent, drag: Drag) => void;
}) {
  return (
    <button
      type="button"
      aria-label={edge === "start" ? "Trim the start" : "Trim the end"}
      title={edge === "start" ? "Drag to trim the start" : "Drag to trim the end"}
      className="absolute inset-y-0 z-20 flex cursor-ew-resize items-center justify-center bg-[var(--brass)] text-[var(--ink)] focus-ring"
      style={{ width: HANDLE, left, borderRadius: edge === "start" ? "6px 0 0 6px" : "0 6px 6px 0" }}
      onPointerDown={(e) => onPress(e, { kind: "trim", edge })}
    >
      <span aria-hidden className="h-5 w-0.5 rounded bg-[var(--ink)]/70" />
    </button>
  );
}

/** Overlays stack into lanes only when they overlap in time. */
function lanesFor(overlays: Overlay[]): { lane: Map<string, number>; count: number } {
  const lane = new Map<string, number>();
  const ends: number[] = [];
  for (const o of [...overlays].sort((a, b) => a.start - b.start)) {
    let i = ends.findIndex((end) => end <= o.start);
    if (i < 0) {
      i = ends.length;
      ends.push(0);
    }
    ends[i] = o.end;
    lane.set(o.id, i);
  }
  return { lane, count: ends.length };
}

function Timeline({
  edit,
  time,
  frames,
  selectedId,
  cards,
  faithful,
  onTime,
  onSelect,
  onEdit,
  onDropCard,
}: {
  edit: VideoEdit;
  time: number;
  frames: Frame[];
  selectedId: string | null;
  cards: DraftCard[];
  faithful: boolean;
  onTime: (t: number) => void;
  onSelect: (id: string | null) => void;
  onEdit: (e: VideoEdit) => void;
  onDropCard: (cardId: string, atSeconds: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pxPerSec = width > 0 ? width / Math.max(1, edit.durationSeconds) : 0;
  const names = useMemo(() => new Map(cards.map((c) => [c.id, cardName(c)])), [cards]);
  const { lane, count } = useMemo(() => lanesFor(edit.overlays), [edit.overlays]);

  const timeAt = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el || pxPerSec <= 0) return 0;
      return clamp((clientX - el.getBoundingClientRect().left) / pxPerSec, 0, edit.durationSeconds);
    },
    [pxPerSec, edit.durationSeconds],
  );

  const begin = useCallback(
    (e: React.PointerEvent, drag: Drag) => {
      if (faithful && drag.kind !== "scrub") return;
      e.stopPropagation();
      dragRef.current = drag;
      ref.current?.setPointerCapture(e.pointerId);
      if (drag.kind === "scrub") onTime(timeAt(e.clientX));
    },
    [faithful, onTime, timeAt],
  );

  /** Press a bar near an end to resize it; anywhere else to move it. */
  const pressBar = useCallback(
    (e: React.PointerEvent, o: Overlay, barWidth: number) => {
      onSelect(o.id);
      const x = e.clientX - (ref.current?.getBoundingClientRect().left ?? 0);
      const left = o.start * pxPerSec;
      // A short bar keeps a grabbable middle: the end zones shrink with it.
      const zone = Math.min(8, barWidth / 4);
      const edge = x - left < zone ? "start" : left + barWidth - x < zone ? "end" : null;
      begin(e, edge ? { kind: "resize", id: o.id, edge } : { kind: "move", id: o.id, grabOffset: timeAt(e.clientX) - o.start });
    },
    [begin, onSelect, pxPerSec, timeAt],
  );

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const t = timeAt(e.clientX);
    if (drag.kind === "scrub") onTime(t);
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

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    if (ref.current?.hasPointerCapture(e.pointerId)) ref.current.releasePointerCapture(e.pointerId);
  };

  const trimmed = edit.trimStart > 0 || edit.trimEnd < edit.durationSeconds;

  return (
    <div
      ref={ref}
      className={cn(
        "relative touch-none select-none rounded-[var(--radius-btn)] border border-border bg-surface transition-colors",
        dropActive && "bg-[color-mix(in_srgb,var(--brass)_12%,transparent)] ring-2 ring-[var(--brass)]",
      )}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragOver={(e) => {
        if (!isCardDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDropActive(true);
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(e) => {
        const cardId = readCardDrag(e);
        setDropActive(false);
        if (!cardId) return;
        e.preventDefault();
        onDropCard(cardId, timeAt(e.clientX));
      }}
    >
      {/* The filmstrip. Press anywhere to scrub; the ends are the trim. */}
      <div
        className="relative flex h-16 overflow-hidden rounded-t-[var(--radius-btn)] bg-[var(--ink)]"
        role="slider"
        aria-label="Scrub"
        aria-valuemin={0}
        aria-valuemax={edit.durationSeconds}
        aria-valuenow={time}
        onPointerDown={(e) => {
          onSelect(null);
          begin(e, { kind: "scrub" });
        }}
      >
        {frames.map((f) =>
          f.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f.time} src={f.url} alt="" draggable={false} className="h-full min-w-0 flex-1 object-cover" />
          ) : (
            <div key={f.time} className="relative h-full min-w-0 flex-1 border-r border-white/10">
              <Poster />
            </div>
          ),
        )}
        {/* What the trim leaves out. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/60" style={{ width: edit.trimStart * pxPerSec }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 bg-black/60" style={{ width: (edit.durationSeconds - edit.trimEnd) * pxPerSec }} />
        {/* The kept region's border, so the strip reads as one clip with ends. */}
        {!faithful ? (
          <div
            className="pointer-events-none absolute inset-y-0 border-y-[3px] border-[var(--brass)]"
            style={{ left: edit.trimStart * pxPerSec, width: (edit.trimEnd - edit.trimStart) * pxPerSec }}
          />
        ) : null}
        {!faithful ? (
          <>
            <TrimHandle edge="start" left={edit.trimStart * pxPerSec} onPress={begin} />
            <TrimHandle edge="end" left={edit.trimEnd * pxPerSec - HANDLE} onPress={begin} />
          </>
        ) : null}
        {trimmed ? (
          <span className="num pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/90">
            {fmtTimecode(edit.trimStart)} → {fmtTimecode(edit.trimEnd)}
          </span>
        ) : null}
      </div>

      {/* Things on the video, in bars under the strip. A lane appears only
          once there is something in it, and a second only when two things
          overlap in time. */}
      {count > 0 ? (
        <div className="relative" style={{ height: count * LANE + 6 }} role="list" aria-label="Things on the video">
          {edit.overlays.map((o) => {
            const text = o.kind === "text";
            const selected = selectedId === o.id;
            const w = Math.max(24, (o.end - o.start) * pxPerSec);
            return (
              <div
                key={o.id}
                role="listitem"
                aria-label={text ? `Text: ${o.text || "empty"}` : sourceLabel(o.source, names)}
                className={cn(
                  "absolute cursor-grab overflow-hidden rounded-[4px] border text-[10px] leading-[20px]",
                  text
                    ? "border-[var(--plum)] bg-[color-mix(in_srgb,var(--plum)_16%,transparent)]"
                    : "border-[var(--brass)] bg-[color-mix(in_srgb,var(--brass)_18%,transparent)]",
                  selected && "ring-2 ring-[var(--ink)]",
                )}
                style={{ left: o.start * pxPerSec, width: w, top: 3 + (lane.get(o.id) ?? 0) * LANE, height: LANE - 4 }}
                onPointerDown={(e) => pressBar(e, o, w)}
              >
                <span className="block truncate px-2 text-text">{text ? o.text || "Text" : sourceLabel(o.source, names)}</span>
                <span aria-hidden className="absolute inset-y-0 left-0 w-2 cursor-ew-resize" />
                <span aria-hidden className="absolute inset-y-0 right-0 w-2 cursor-ew-resize" />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* The playhead, across everything. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-30 w-px bg-[var(--rust)]"
        style={{ transform: `translateX(${time * pxPerSec}px)` }}
      >
        <button
          type="button"
          aria-label="Playhead"
          className="pointer-events-auto absolute -left-[7px] -top-[7px] h-[14px] w-[14px] cursor-ew-resize rounded-full bg-[var(--rust)] focus-ring"
          onPointerDown={(e) => begin(e, { kind: "scrub" })}
        />
      </div>
    </div>
  );
}

/* ---------- what appears when something is selected ---------- */

function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (t: number) => void }) {
  const [typed, setTyped] = useState<{ forValue: number; text: string } | null>(null);
  const draft = typed?.forValue === value ? typed.text : fmtTimecode(value);
  const setDraft = (text: string) => setTyped({ forValue: value, text });
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
        className="num w-16 rounded-[4px] border border-border bg-bg px-1.5 py-0.5 text-[11px] text-text focus-ring"
      />
    </label>
  );
}

function Selected({
  overlay,
  edit,
  cards,
  ticker,
  onEdit,
  onRemove,
  onDone,
}: {
  overlay: Overlay;
  edit: VideoEdit;
  cards: DraftCard[];
  ticker?: string;
  onEdit: (e: VideoEdit) => void;
  onRemove: () => void;
  onDone: () => void;
}) {
  const update = (patch: Partial<Overlay>) =>
    onEdit({ ...edit, overlays: edit.overlays.map((o) => (o.id === overlay.id ? ({ ...o, ...patch } as Overlay) : o)) });
  const setStart = (t: number) => update({ start: clamp(t, 0, overlay.end - MIN_EVENT) });
  const setEnd = (t: number) => update({ end: clamp(t, overlay.start + MIN_EVENT, edit.durationSeconds) });
  const chip = (on: boolean) =>
    cn(
      "focus-ring rounded-[4px] border px-2 py-1 text-[11px]",
      on ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-border text-text-mute hover:text-text",
    );

  return (
    <div className="rounded-[var(--radius-btn)] border border-[var(--ink)] bg-surface p-3" role="group" aria-label="Selected">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="num text-[10px] uppercase tracking-[0.16em] text-text">
          {overlay.kind === "text" ? "Text" : sourceLabel(overlay.source, new Map(cards.map((c) => [c.id, cardName(c)])))}
        </span>
        <span className="num text-[10px] uppercase tracking-[0.12em] text-text-faint">
          {overlay.kind === "visual" && overlay.mode === "inset"
            ? "Drag it on the picture to place it · drag its gold corner to resize it · drag the ends of its bar to time it"
            : overlay.kind === "visual"
              ? "Fills the picture while it shows · drag the ends of its bar to time it"
              : "Drag it on the picture to place it · drag the ends of its bar to time it"}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <TimeField label="From" value={overlay.start} onChange={setStart} />
          <TimeField label="To" value={overlay.end} onChange={setEnd} />
          <button type="button" onClick={onRemove} className="num text-[10px] uppercase tracking-[0.12em] text-[var(--rust)] focus-ring rounded">
            Remove
          </button>
          <button type="button" onClick={onDone} className="num text-[10px] uppercase tracking-[0.12em] text-text-mute hover:text-text focus-ring rounded">
            Done
          </button>
        </div>
      </div>

      {overlay.kind === "text" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={overlay.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="The words"
            aria-label="Overlay text"
            className="min-w-[16rem] flex-1 rounded-[4px] border border-border bg-bg px-2 py-1.5 text-sm text-text focus-ring"
          />
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Size">
            {(["sm", "md", "lg"] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={overlay.size === s} onClick={() => update({ size: s })} className={cn(chip(overlay.size === s), "uppercase")}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="How it shows">
            {(["inset", "cutaway"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={overlay.mode === m} onClick={() => update({ mode: m })} className={chip(overlay.mode === m)}>
                {m === "cutaway" ? "Full frame, audio continues" : "Over the picture"}
              </button>
            ))}
          </div>
          {/* Size and opacity as sliders too: the corner is the direct way,
              and this is the one that works from a keyboard or a phone. */}
          {overlay.mode === "inset" ? (
            <label className="flex items-center gap-2 text-[11px] text-text-mute">
              Size
              <input
                type="range"
                min={INSET_MIN_SIZE}
                max={INSET_MAX_SIZE}
                step={0.01}
                value={insetSize(overlay)}
                onChange={(e) => update({ size: Number(e.target.value) })}
                aria-label="Size"
                className="w-28 accent-[var(--ink)]"
              />
              <span className="num w-8 text-right text-[11px] text-text">{Math.round(insetSize(overlay) * 100)}%</span>
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-[11px] text-text-mute">
            Opacity
            <input
              type="range"
              min={OVERLAY_MIN_OPACITY}
              max={1}
              step={0.05}
              value={overlayOpacity(overlay)}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
              aria-label="Opacity"
              className="w-28 accent-[var(--ink)]"
            />
            <span className="num w-8 text-right text-[11px] text-text">{Math.round(overlayOpacity(overlay) * 100)}%</span>
          </label>
          {overlay.mode === "cutaway" ? (
            <span className="num w-full text-[10px] uppercase tracking-[0.12em] text-text-faint">
              While a full-frame visual shows, text and insets on the same seconds wait for it to finish
            </span>
          ) : null}
          {overlay.source.type === "card" && cards.length > 0 ? (
            <label className="flex items-center gap-1.5 text-[11px] text-text-mute">
              Card
              <select
                value={overlay.source.cardId ?? ""}
                onChange={(e) => {
                  const c = cards.find((x) => x.id === e.target.value);
                  if (c) update({ source: { type: "card", cardId: c.id, label: cardName(c) } });
                }}
                className="rounded-[4px] border border-border bg-bg px-2 py-1 text-[12px] text-text focus-ring"
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cardName(c)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {overlay.source.type === "chart" ? (
            <div className="-mt-3">
              <OverlayChartFields
                ticker={overlay.source.ticker}
                compareTicker={overlay.source.compareTicker}
                fallbackTicker={ticker}
                onChange={(next) => update({ source: { type: "chart", ticker: next.ticker, compareTicker: next.compareTicker } })}
              />
            </div>
          ) : null}
          {overlay.source.type === "diagram" ? (
            <div className="-mt-3 w-full max-w-[32rem]">
              <OverlayVisualizeFields
                prompt={overlay.source.prompt}
                imageUrl={overlay.source.imageUrl}
                onChange={(next) => update({ source: { type: "diagram", prompt: next.prompt, imageUrl: next.imageUrl } })}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ---------- what you can add, when nothing is selected ---------- */

function AddRow({
  cards,
  onText,
  onCard,
  onChart,
  onVisualize,
  onImage,
}: {
  cards: DraftCard[];
  onText: () => void;
  onCard: (card: DraftCard) => void;
  onChart: () => void;
  onVisualize: () => void;
  onImage: (file: File) => void;
}) {
  const [pick, setPick] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="num mr-1 text-[10px] uppercase tracking-[0.16em] text-text-faint">Add at the playhead</span>
      <Button variant="secondary" size="sm" onClick={onText}>
        <Type size={14} /> Text
      </Button>
      <div className="relative">
        <Button variant="secondary" size="sm" onClick={() => setPick((p) => !p)} aria-expanded={pick} disabled={cards.length === 0} title={cards.length === 0 ? "Make a card first, on the Cards step" : undefined}>
          <Layers size={14} /> Card
        </Button>
        {pick ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPick(false)} aria-hidden />
            <div className="menu-pop absolute left-0 top-9 z-20 w-56 rounded-[var(--radius-btn)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]" role="menu">
              {cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onCard(c);
                    setPick(false);
                  }}
                  className="focus-ring block w-full truncate rounded-[4px] px-2 py-1.5 text-left text-[0.8125rem] text-text hover:bg-surface-2"
                >
                  {cardName(c)}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
      <Button variant="secondary" size="sm" onClick={onChart}>
        <TrendingUp size={14} /> Chart
      </Button>
      <Button variant="secondary" size="sm" onClick={onVisualize}>
        <Sparkles size={14} /> Visualize
      </Button>
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImage(f);
          e.target.value = "";
        }}
      />
      <Button variant="secondary" size="sm" onClick={() => imageRef.current?.click()}>
        <ImagePlus size={14} /> Image
      </Button>
      <span className="num hidden w-full text-[10px] uppercase tracking-[0.12em] text-text-faint lg:block">
        Or drag a card from the toolbox onto the strip
      </span>
    </div>
  );
}

/* ---------- the cover ---------- */

function Cover({ frames, edit, onChange }: { frames: Frame[]; edit: VideoEdit; onChange: (t: VideoEdit["thumbnail"]) => void }) {
  const [open, setOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const chosen = edit.thumbnail;
  const chosenUrl =
    chosen?.type === "upload" ? chosen.url : chosen?.type === "frame" ? (frames.find((f) => Math.abs(f.time - chosen.time) < 0.05)?.url ?? null) : null;

  return (
    <section aria-label="Cover" className="rounded-[var(--radius-btn)] border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <div className="relative aspect-[4/5] w-10 shrink-0 overflow-hidden rounded-[4px] bg-[var(--ink)]">
          {chosenUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chosenUrl} alt="Chosen cover" className="h-full w-full object-cover" />
          ) : (
            <Poster />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="num text-[10px] uppercase tracking-[0.16em] text-text">Cover</p>
          <p className="truncate text-[0.8125rem] text-text-mute">
            {chosen?.type === "frame"
              ? `The frame at ${fmtTimecode(chosen.time)}`
              : chosen?.type === "upload"
                ? "Your image"
                : "None chosen yet. This is what people click."}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Done" : chosen ? "Change" : "Choose"}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 border-t border-border pt-3">
          <div className="scroll-area flex gap-1.5 overflow-x-auto pb-1">
            {frames.map((f) => (
              <button
                key={f.time}
                type="button"
                onClick={() => onChange({ type: "frame", time: f.time })}
                aria-label={`The frame at ${fmtTimecode(f.time)}`}
                className={cn(
                  "focus-ring relative h-16 w-12 flex-none overflow-hidden rounded-[4px] border bg-[var(--ink)]",
                  chosen?.type === "frame" && Math.abs(chosen.time - f.time) < 0.05 ? "border-[var(--ink)] ring-2 ring-[var(--ink)]" : "border-border",
                )}
              >
                {f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Poster />
                )}
                <span className="num absolute bottom-0.5 right-1 text-[10px] text-white/80">{fmtTimecode(f.time).replace(/\.0$/, "")}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
              <ImagePlus size={14} /> Use an image instead
            </Button>
            <span className="num text-[10px] uppercase tracking-[0.12em] text-text-faint">Shown at 4:5, as on Explore and the profile</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- the rung ---------- */

export function VideoRung({
  initial,
  demoDurationSeconds = 90,
  onChange,
  onFile,
  value,
  cards = [],
  chrome = true,
  ticker,
  stage = "all",
  hasClip = false,
  onRemove,
}: {
  initial?: VideoEdit;
  /** Duration used for the poster stage when no file is loaded. */
  demoDurationSeconds?: number;
  onChange?: (edit: VideoEdit) => void;
  onFile?: (file: File, durationSeconds: number) => void;
  /** Controlled edit. Given, the workspace owns the edit and can place a card
   *  on the timeline from outside (the tray's Place menu on a touch screen). */
  value?: VideoEdit;
  /** The publication's deck, so a card overlay draws the real card. */
  cards?: DraftCard[];
  /** False when a module header already frames this, so the rung drops its own. */
  chrome?: boolean;
  ticker?: string;
  /**
   * Which half of the rung to show. The guided sequence asks for the clip in
   * one step and edits it in the next: "choose" is the picker and the stage,
   * "edit" is the stage, the timeline and the cover. "all" is both.
   */
  stage?: "choose" | "edit" | "all";
  /** The publication already has a clip (saved, or chosen here). */
  hasClip?: boolean;
  /** Take the clip out. Offered beside Replace, never as a forward button. */
  onRemove?: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [internalEdit, setEditState] = useState<VideoEdit>(initial ?? value ?? emptyEdit(demoDurationSeconds));
  const edit = value ?? internalEdit;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [faithful, setFaithful] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const frames = useFrames(src, edit.durationSeconds, STRIP_FRAMES);

  const setEdit = useCallback(
    (e: VideoEdit) => {
      setEditState(e);
      onChange?.(e);
    },
    [onChange],
  );

  const selected = useMemo(() => edit.overlays.find((o) => o.id === selectedId) ?? null, [edit.overlays, selectedId]);

  // The real video follows the playhead; the poster stage runs a clock.
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

  const jump = useCallback((t: number) => setTime(clamp(t, 0, edit.durationSeconds)), [edit.durationSeconds]);
  const play = () => {
    // Playing from outside the kept region would show what the trim cut.
    if (!playing && (time < edit.trimStart || time >= edit.trimEnd)) setTime(edit.trimStart);
    setPlaying((p) => !p);
  };

  /** A new thing at the playhead, selected so its controls appear. */
  const add = (o: Overlay) => {
    setEdit({ ...edit, overlays: [...edit.overlays, o] });
    setSelectedId(o.id);
  };
  const span = (at: number, len: number) => {
    const start = clamp(at, 0, Math.max(0, edit.durationSeconds - len));
    return { start, end: Math.min(edit.durationSeconds, start + len) };
  };
  const addText = () => add({ id: uid(), kind: "text", ...span(time, 3), text: "", position: 8, size: "md" });
  const addVisual = (source: VisualSource, at = time) =>
    add({ id: uid(), kind: "visual", ...span(at, 4), source, mode: "inset", position: 3 });
  const placeCard = useCallback(
    (cardId: string, at: number) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const start = clamp(at, 0, Math.max(0, edit.durationSeconds - 4));
      const o: VisualOverlay = {
        id: uid(),
        kind: "visual",
        start,
        end: Math.min(edit.durationSeconds, start + 4),
        source: { type: "card", cardId, label: cardName(card) },
        mode: "inset",
        position: 3,
      };
      setEdit({ ...edit, overlays: [...edit.overlays, o] });
      setSelectedId(o.id);
    },
    [cards, edit, setEdit],
  );

  const patch = (id: string, p: Partial<Overlay>) =>
    setEdit({ ...edit, overlays: edit.overlays.map((o) => (o.id === id ? ({ ...o, ...p } as Overlay) : o)) });
  const remove = (id: string) => {
    setEdit({ ...edit, overlays: edit.overlays.filter((o) => o.id !== id) });
    setSelectedId(null);
  };

  const editing = stage !== "choose";

  return (
    <section
      aria-label="Video"
      className={cn(chrome && "mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-5")}
    >
      {chrome || stage !== "edit" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {chrome ? (
            <div>
              <p className="t-eyebrow">Video</p>
              <p className="mt-1 text-[13px] text-text-mute">The video is the seed. Call, cards and thesis are optional below.</p>
            </div>
          ) : null}
          {stage !== "edit" ? (
            <div className="ml-auto flex items-center gap-2">
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
                    onFile?.(f, d);
                  });
                }}
              />
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> {src || hasClip ? "Replace video" : "Choose a video"}
              </Button>
              {(src || hasClip) && onRemove ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSrc(null);
                    setEditState(emptyEdit(demoDurationSeconds));
                    onRemove();
                  }}
                >
                  Remove video
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Wide enough to judge a frame, never so tall that the timeline
          drops below the fold: the picture is capped at under half the
          viewport, which is how CapCut's desktop layout splits the screen. */}
      <div className="mx-auto w-full max-w-[min(880px,calc(44vh*16/9))]">
        <Stage
          src={src}
          time={time}
          edit={edit}
          cards={cards}
          playing={playing}
          videoRef={videoRef}
          onTogglePlay={play}
          faithful={faithful || !editing}
          ticker={ticker}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={(id, position) => patch(id, { position })}
          onResize={(id, size) => patch(id, { size })}
          onText={(id, text) => patch(id, { text })}
        />
        {!src ? (
          <p className="num mt-2 text-[10px] uppercase tracking-[0.12em] text-text-faint">
            {hasClip ? "The saved clip plays here once it has been processed" : "No video loaded"} · the stage runs a{" "}
            {fmtTimecode(edit.durationSeconds).replace(/\.0$/, "")} clock so things can still be placed on it
          </p>
        ) : null}

        {editing ? (
          <div
            className="mt-4 space-y-3 outline-none"
            tabIndex={0}
            role="application"
            aria-label="Timeline"
            onKeyDown={(e) => {
              const t = e.target as HTMLElement;
              if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return;
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                jump(time - (e.shiftKey ? 10 : 1) * FRAME);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                jump(time + (e.shiftKey ? 10 : 1) * FRAME);
              } else if (e.key === " ") {
                e.preventDefault();
                play();
              } else if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
                e.preventDefault();
                remove(selectedId);
              } else if (e.key === "Escape") {
                setSelectedId(null);
              }
            }}
          >
            {/* Transport: play, where you are, and the faithful preview. */}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={play} className="rail-arrow focus-ring" aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <span className="num text-[12px] text-text">
                {fmtTimecode(time)} <span className="text-text-faint">/ {fmtTimecode(edit.durationSeconds)}</span>
              </span>
              {edit.trimStart > 0 || edit.trimEnd < edit.durationSeconds ? (
                <span className="num text-[10px] uppercase tracking-[0.12em] text-text-mute">
                  Keeps {fmtTimecode(edit.trimEnd - edit.trimStart)}
                </span>
              ) : null}
              <Button
                variant={faithful ? "primary" : "secondary"}
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setFaithful((f) => !f);
                  setSelectedId(null);
                }}
                aria-pressed={faithful}
              >
                {faithful ? <EyeOff size={14} /> : <Eye size={14} />}
                {faithful ? "Back to editing" : "Preview as it will publish"}
              </Button>
            </div>

            <Timeline
              edit={edit}
              time={time}
              frames={frames}
              selectedId={selectedId}
              cards={cards}
              faithful={faithful}
              onTime={jump}
              onSelect={setSelectedId}
              onEdit={setEdit}
              onDropCard={placeCard}
            />

            {faithful ? (
              <p className="num text-[10px] uppercase tracking-[0.12em] text-text-faint">
                Plays exactly as it will publish. Overlays burn into the video and cannot be removed afterwards.
              </p>
            ) : selected ? (
              <Selected
                overlay={selected}
                edit={edit}
                cards={cards}
                ticker={ticker}
                onEdit={setEdit}
                onRemove={() => remove(selected.id)}
                onDone={() => setSelectedId(null)}
              />
            ) : (
              <AddRow
                cards={cards}
                onText={addText}
                onCard={(c) => placeCard(c.id, time)}
                onChart={() => addVisual({ type: "chart", ticker: ticker || "SPY" })}
                onVisualize={() => addVisual({ type: "diagram", prompt: "", imageUrl: null })}
                onImage={(f) => addVisual({ type: "upload", label: f.name, imageUrl: URL.createObjectURL(f) })}
              />
            )}

            {!faithful ? (
              <p className="num text-[10px] uppercase tracking-[0.12em] text-text-faint">
                Drag the gold ends of the strip to trim · everything placed on the video is permanent once published
              </p>
            ) : null}
          </div>
        ) : null}

        {editing ? (
          <div className="mt-4">
            <Cover frames={frames} edit={edit} onChange={(t) => setEdit({ ...edit, thumbnail: t })} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
