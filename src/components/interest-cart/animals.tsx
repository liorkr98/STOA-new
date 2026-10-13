import { cn } from "@/lib/design/cn";

/**
 * The Interest Cart animals, exactly as extracted from the feature one-pager.
 * Do not redraw, recolour or swap them for emoji, and do not draw them
 * anywhere but through this file.
 *
 * The colours are a named exception to the palette ("Interest Cart animals",
 * docs/DESIGN_LANGUAGE.md 1.3): fixed, not tokens, identical in light and
 * dark. In the one-pager the muzzle, eyes and nose were holes onto a dark
 * card, which breaks on a white panel, so here they are the solid colours
 * that card showed. `npm run test:contrast` checks this list against the doc.
 */
export const CART_ANIMAL_COLOURS = ["#4CC38A", "#3E976E", "#FF6B6B", "#C45557", "#141719"] as const;

/** Smallest size an animal may be drawn at. */
const MIN_SIZE = 14;

function BullArt() {
  return (
    <>
      <path d="M 6.99 7.99 C 4.99 17.99 10.99 22.99 17.99 20.99" stroke="#4CC38A" strokeWidth="4" strokeLinecap="round" />
      <path d="M 41.00 7.99 C 43.00 17.99 37.00 22.99 30.00 20.99" stroke="#4CC38A" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="11" cy="24" rx="5" ry="3" fill="#4CC38A" />
      <ellipse cx="37" cy="24" rx="5" ry="3" fill="#4CC38A" />
      <path d="M 14 18 L 34 18 C 36.5 28 34 38 30.25 41 L 17.75 41 C 14 38 11.5 28 14 18 Z" fill="#4CC38A" />
      <ellipse cx="24" cy="36.2" rx="5.6" ry="3.8" fill="#3E976E" />
    </>
  );
}

function BearArt() {
  return (
    <>
      <circle cx="13" cy="14.8" r="6" fill="#FF6B6B" />
      <circle cx="35" cy="14.8" r="6" fill="#FF6B6B" />
      <circle cx="24" cy="27.8" r="15" fill="#FF6B6B" />
      <ellipse cx="24" cy="34" rx="6.2" ry="4.8" fill="#C45557" />
      <circle cx="18" cy="24.8" r="2" fill="#141719" />
      <circle cx="30" cy="24.8" r="2" fill="#141719" />
      <ellipse cx="24" cy="31.35" rx="2.5" ry="2.05" fill="#141719" />
    </>
  );
}

type IconProps = { size?: number; className?: string };

export function BullIcon({ size = 18, className }: IconProps) {
  const px = Math.max(MIN_SIZE, size);
  return (
    <svg viewBox="0 0 48 48" width={px} height={px} fill="none" aria-hidden focusable="false" className={cn("shrink-0", className)}>
      <BullArt />
    </svg>
  );
}

export function BearIcon({ size = 18, className }: IconProps) {
  const px = Math.max(MIN_SIZE, size);
  return (
    <svg viewBox="0 0 48 48" width={px} height={px} aria-hidden focusable="false" className={cn("shrink-0", className)}>
      <BearArt />
    </svg>
  );
}

/** Paper stroke around the bear's circles, in viewBox units: 2.6px on screen at 18px. */
const HALO = (2.6 * 2 * 48) / 18;

/**
 * The cart's own mark in the nav: the bull (20px) with the bear (18px)
 * overlapping it at the right, separated by a paper-coloured outline. A
 * shopping cart or basket would read as a pending order; Stoa executes
 * nothing. `muted` draws the pair in grey for an empty week.
 */
export function CartMark({ muted = false, className }: { muted?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 30 22"
      width={30}
      height={22}
      aria-hidden
      focusable="false"
      className={cn("shrink-0", muted && "opacity-60 [filter:grayscale(1)]", className)}
    >
      <g transform={`translate(0 1) scale(${20 / 48})`} fill="none">
        <BullArt />
      </g>
      <g transform={`translate(12 2) scale(${18 / 48})`}>
        <g style={{ fill: "var(--paper)", stroke: "var(--paper)" }} strokeWidth={HALO}>
          <circle cx="13" cy="14.8" r="6" />
          <circle cx="35" cy="14.8" r="6" />
          <circle cx="24" cy="27.8" r="15" />
        </g>
        <BearArt />
      </g>
    </svg>
  );
}
