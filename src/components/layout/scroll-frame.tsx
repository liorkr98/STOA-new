"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/design/cn";
import { frameHeight, scrollParent } from "@/lib/layout/frame";

const setHeight = (root: HTMLElement, height: number) => {
  root.style.height = `${height}px`;
};

/**
 * Keeps an element exactly as tall as the room its scroller gives it. See
 * src/lib/layout/frame.ts for why this exists instead of `sticky`.
 *
 * `apply` receives each measurement; by default it becomes the element's
 * height. A surface whose children need the number too (the Feed's snap
 * sections) can write it as a custom property instead. Pass a function that
 * does not change between renders: a new one re-measures on every render.
 */
export function useFrameHeight<T extends HTMLElement>(
  apply: (root: T, height: number) => void = setHeight,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const scroller = scrollParent(root);
    const fit = () => {
      apply(root, frameHeight(root, scroller));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(scroller);
    ro.observe(document.documentElement);
    // Whatever sits above the frame lives in the parent; when that wraps or
    // grows, the room below it changes.
    if (root.parentElement) ro.observe(root.parentElement);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [apply]);
  return ref;
}

/**
 * The frame itself: a flex box that fills its room and clips, so the
 * columns inside it (each `SCROLL_COLUMN`) scroll on their own. The class
 * height is only the guess for the server-rendered paint; the hook measures
 * the real room before the first client paint.
 *
 * On a phone the frame runs underneath the floating tab pill
 * (`.frame-under-tabs`), so whatever scrolls inside it passes behind the
 * glass. Every column that scrolls must then carry the clearance itself:
 * `SCROLL_COLUMN` does, and a frame that is its own scroller pads
 * `--tab-h + --main-pad-y` at the bottom.
 */
export function ScrollFrame({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useFrameHeight<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "frame-under-tabs flex h-[calc(var(--app-h)-var(--nav-h))] min-h-0 overflow-hidden",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
