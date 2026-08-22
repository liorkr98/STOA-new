import { analystColor } from "@/lib/design/analyst-color";
import { cn } from "@/lib/design/cn";

/**
 * A generated stand-in for a video thumbnail, drawn in the browser.
 *
 * Nothing is stored: no file is uploaded, no row is written, no URL is minted.
 * It exists only while real thumbnails do not, and every call site renders it
 * behind a `thumbnailUrl ? real : placeholder` check, so the moment a real
 * thumbnail exists this disappears on its own with no migration and no cleanup.
 *
 * It is deliberately, obviously synthetic up close -- a flat two-tone wash and
 * one abstract figure -- while still reading as "a person on camera" at
 * thumbnail size. It carries no text and no initials: the surrounding UI
 * already states the analyst and the headline, and repeating them here would
 * add noise at the size where the image has to do its work.
 *
 * It is NOT a video affordance. It never draws a play glyph, a duration or a
 * VIDEO badge; those are earned from a stored clip and stay with the call site.
 */
export function PlaceholderThumb({
  seed,
  className,
}: {
  /** The analyst's id, so the colour is stable and the same everywhere. */
  seed: string | null | undefined;
  className?: string;
}) {
  const color = analystColor(seed);

  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 overflow-hidden", className)}
      style={{
        // Soft two-tone: a paper-mixed tint falling to the base tone. Mixing
        // toward paper rather than white keeps it warm and on-palette.
        backgroundImage: `linear-gradient(158deg, color-mix(in srgb, ${color} 55%, var(--paper)) 0%, ${color} 100%)`,
      }}
    >
      {/*
        Bottom-aligned so the shoulders always meet the bottom edge, whatever
        the container's aspect ratio: 16:9 on Today, 4:5 on an Explore tile,
        near-square on a row rail.
      */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMax meet"
        className="absolute inset-0 h-full w-full"
        role="presentation"
        focusable="false"
      >
        <g fill="var(--paper)" fillOpacity={0.2}>
          <circle cx="50" cy="38" r="14" />
          <path d="M14 100c0-21 16-33 36-33s36 12 36 33z" />
        </g>
      </svg>
    </div>
  );
}
