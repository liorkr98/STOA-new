"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { canPopHistory, installHistoryDepth } from "@/lib/nav/back";
import { isStandaloneDisplay } from "@/lib/pwa/display";

/** Stamps each history entry with its depth in the app, so Back knows whether a page is behind it. */
export function HistoryDepth() {
  useEffect(() => {
    installHistoryDepth();
  }, []);
  return null;
}

/** How close to the left edge a drag must start, in CSS pixels. */
const EDGE = 24;
/** How far it must travel to go back. */
const COMMIT = 80;
/** Where the indicator stops following the finger. */
const TRAVEL = 96;

/**
 * Swipe from the left edge to go back, for the installed app.
 *
 * A browser tab has this already: Safari and Chrome own the gesture and the
 * page never sees it. An app added to the iPhone home screen runs with no
 * browser around it, and iOS gives it no back gesture at all, so a
 * publication opened from Today had no way back but the tab bar. This puts
 * the gesture back, only there: in a browser tab it would go back twice.
 *
 * It listens on the window in the capture phase, so it hears a drag before
 * whatever is under the finger (the Feed's sideways card track, the stories
 * overlay's analyst swipe) and, once the drag is clearly back-and-sideways,
 * keeps it from them. Compose is left out: leaving it has its own guard for
 * unsaved work, which only its Back link goes through.
 */
export function EdgeSwipeBack() {
  const router = useRouter();
  const pathname = usePathname();
  const indicator = useRef<HTMLDivElement>(null);
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    let engaged = false;
    let dx = 0;

    const show = (x: number) => {
      const el = indicator.current;
      if (!el) return;
      const t = Math.min(x, TRAVEL);
      el.style.transform = `translate3d(${t - 44}px, -50%, 0)`;
      el.style.opacity = String(Math.min(1, t / COMMIT));
      el.dataset.ready = x >= COMMIT ? "true" : "false";
    };
    const hide = () => {
      const el = indicator.current;
      if (!el) return;
      el.style.transform = "translate3d(-44px, -50%, 0)";
      el.style.opacity = "0";
      el.dataset.ready = "false";
    };
    const reset = () => {
      start = null;
      engaged = false;
      dx = 0;
      hide();
    };

    const onStart = (e: TouchEvent) => {
      reset();
      if (e.touches.length !== 1 || !isStandaloneDisplay()) return;
      if (pathRef.current.startsWith("/studio/compose")) return;
      const t = e.touches[0];
      if (t.clientX > EDGE) return;
      start = { x: t.clientX, y: t.clientY };
    };

    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const t = e.touches[0];
      if (!t) return;
      dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (!engaged) {
        // Decided on the first movement: a scroller cannot be stopped once it has started.
        if (dx > 0 && dx >= Math.abs(dy)) engaged = true;
        else {
          start = null;
          return;
        }
      }
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      show(Math.max(0, dx));
    };

    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const go = engaged && dx >= COMMIT;
      if (engaged) e.stopPropagation();
      reset();
      if (!go) return;
      if (canPopHistory()) router.back();
      else if (pathRef.current !== "/home") router.push("/home");
    };

    const opts = { capture: true, passive: false } as const;
    window.addEventListener("touchstart", onStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onMove, opts);
    window.addEventListener("touchend", onEnd, opts);
    window.addEventListener("touchcancel", reset, { capture: true });
    return () => {
      window.removeEventListener("touchstart", onStart, { capture: true });
      window.removeEventListener("touchmove", onMove, opts);
      window.removeEventListener("touchend", onEnd, opts);
      window.removeEventListener("touchcancel", reset, { capture: true });
    };
  }, [router]);

  return (
    <div ref={indicator} aria-hidden className="edge-back">
      <ChevronLeft size={22} strokeWidth={2.4} />
    </div>
  );
}
