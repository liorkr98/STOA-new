import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/design/cn";

/**
 * Mount fade. A CSS animation rather than a scroll-triggered reveal: the spec
 * bans scroll reveals (MOTION dial 3), and gating visibility on an observer
 * ships blank sections in hidden tabs and headless renderers. With `both`
 * fill the element starts at the keyframe's `from`, and the global
 * prefers-reduced-motion rule collapses it to an instant state-swap.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("fade-up", className)}
      style={
        {
          animationDelay: delay ? `${delay}s` : undefined,
          "--fade-y": `${y}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
