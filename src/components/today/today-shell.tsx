"use client";

import { useFrameHeight } from "@/components/layout/scroll-frame";

/**
 * Today's frame. On a desktop the rail and the page are two columns that
 * scroll on their own inside the room under the nav (`.today-frame`,
 * `.today-column`, and the measured height from src/lib/layout/frame.ts). On
 * a phone there is no frame at all: the page is one document scroll inside
 * the shell's main, which already pads its end clear of the floating tab
 * bar, so the measured height is not applied.
 */
const applyAtDesktop = (root: HTMLDivElement, height: number) => {
  root.style.height = window.matchMedia("(min-width: 768px)").matches ? `${height}px` : "";
};

export function TodayShell({ children }: { children: React.ReactNode }) {
  const ref = useFrameHeight<HTMLDivElement>(applyAtDesktop);
  return (
    <div ref={ref} className="today-frame">
      {children}
    </div>
  );
}
