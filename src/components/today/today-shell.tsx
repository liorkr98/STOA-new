"use client";

import { useFrameHeight } from "@/components/layout/scroll-frame";

/**
 * Today's frame. On a desktop the rail and the page are two columns that
 * scroll on their own inside the room under the nav (`.ts-frame`,
 * `.ts-column`, and the measured height from src/lib/layout/frame.ts). On a
 * phone there is no frame at all: the page is one document scroll, so the
 * measured height is not applied.
 */
const applyAtDesktop = (root: HTMLDivElement, height: number) => {
  root.style.height = window.matchMedia("(min-width: 768px)").matches ? `${height}px` : "";
};

export function TodayShell({ children }: { children: React.ReactNode }) {
  const ref = useFrameHeight<HTMLDivElement>(applyAtDesktop);
  return (
    <div ref={ref} className="today-sheet ts-frame">
      {children}
    </div>
  );
}
