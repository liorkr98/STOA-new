"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/design/cn";
import { frameHeight, scrollParent } from "@/lib/layout/frame";

/**
 * Keeps an element exactly as tall as the room its scroller gives it. See
 * src/lib/layout/frame.ts for why this exists instead of `sticky`.
 */
export function useFrameHeight<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const scroller = scrollParent(root);
    const fit = () => {
      root.style.height = `${frameHeight(root, scroller)}px`;
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
  }, []);
  return ref;
}

/**
 * The frame itself: a flex box that fills its room and clips, so the
 * columns inside it (each `SCROLL_COLUMN`) scroll on their own. The class
 * height is only the guess for the server-rendered paint; the hook measures
 * the real room before the first client paint.
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
      className={cn("flex h-[calc(var(--app-h)-var(--nav-h))] min-h-0 overflow-hidden", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
