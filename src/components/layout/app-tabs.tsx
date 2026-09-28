"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Clapperboard, Compass, LineChart, Newspaper, PenLine } from "lucide-react";
import { LinkPending } from "@/components/layout/link-pending";
import { initialShrinkState, nextShrinkState, restingProgress } from "@/lib/nav/scroll-shrink";

const TABS = [
  { key: "feed", href: "/feed", label: "Feed", Icon: Clapperboard },
  { key: "today", href: "/home", label: "Today", Icon: Newspaper },
  { key: "create", href: "/studio/compose", label: "Create", Icon: PenLine },
  { key: "explore", href: "/explore", label: "Explore", Icon: Compass },
  { key: "markets", href: "/markets", label: "Markets", Icon: LineChart },
] as const;

/** How closely the pill follows the scroll: a time constant, in ms. */
const FOLLOW_TAU_MS = 80;
/** Once the scroll has been still this long, the pill settles to the nearer size. */
const SETTLE_AFTER_MS = 140;
/** How gently it settles. */
const SETTLE_TAU_MS = 110;

function tabActive(pathname: string, href: string, key: string) {
  // The /dev fixture of a surface shows the surface's real chrome, active tab included.
  if (pathname === `/dev/${key}`) return true;
  if (href === "/feed") return pathname === "/feed" || pathname === "/";
  if (href === "/studio/compose") return pathname.startsWith("/studio/compose");
  return pathname.startsWith(href);
}

/**
 * Phone chrome for the reader surfaces, plus Create in the middle.
 * Desktop keeps the top links. Explore's Feed overlay portals above this bar (z-70).
 *
 * Hidden on Compose so the editor owns the viewport. A floating pill rather
 * than a bar welded to the edge, so the page reads behind and around it. The
 * pill is frosted paper (see `.app-tabs-pill`), so the page also reads through
 * it. The current tab is marked by one lens (`.app-tabs-lens`), a translucent
 * capsule that slides from the old tab to the new one and stretches on the
 * way, the way iOS 26's tab bar moves; it is a single element positioned
 * over the current link, not a style on each link, which is what lets it
 * travel.
 */
export function AppTabs() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const lensRef = useRef<HTMLSpanElement>(null);
  // The tab just tapped, so the lens sets off before the route has changed.
  // Remembered with the path it was tapped on: once the route moves, the
  // route decides again, with no effect needed to forget the tap.
  const [pending, setPending] = useState<{ key: string; from: string } | null>(null);

  const routeKey = TABS.find((t) => tabActive(pathname, t.href, t.key))?.key ?? null;
  const activeKey = pending && pending.from === pathname ? pending.key : routeKey;

  // Place the lens over the current tab's slot, inset 2.5px either side.
  // Every slot is the same size, so the lens is too, whatever the label
  // says. The first placement is instant; every later one travels. Width is
  // set, not animated, and only transform moves.
  useLayoutEffect(() => {
    const list = listRef.current;
    const lens = lensRef.current;
    if (!list || !lens) return;
    let placed = lens.dataset.placed === "";
    const place = () => {
      const slot = activeKey ? list.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`) : null;
      if (!slot) {
        lens.style.opacity = "0";
        return;
      }
      const l = list.getBoundingClientRect();
      const r = slot.getBoundingClientRect();
      // Read in the list's own frame, unscaled: the shrink transform scales
      // both rects equally, so the ratio to the list's width is exact. The
      // lens is positioned from the padding edge, hence clientLeft.
      const scale = l.width / list.offsetWidth || 1;
      const x = (r.left - l.left) / scale - list.clientLeft + 2.5;
      const w = r.width / scale - 5;
      const next = `translateX(${x}px)`;
      // A real move, not a re-measure that lands a fraction of a pixel off.
      const moved = placed && Math.abs(x - Number(lens.dataset.x ?? x)) > 1;
      lens.dataset.x = String(x);
      lens.style.opacity = "1";
      lens.style.width = `${w}px`;
      if (!placed) lens.style.transition = "none";
      lens.style.transform = next;
      if (!placed) {
        void lens.offsetWidth;
        lens.style.transition = "";
        lens.dataset.placed = "";
        placed = true;
      } else if (moved) {
        // Restart the stretch on every real move, not on a re-measure.
        lens.classList.remove("app-tabs-lens-travel");
        void lens.offsetWidth;
        lens.classList.add("app-tabs-lens-travel");
      }
    };
    place();
    const ro = new ResizeObserver(() => place());
    ro.observe(list);
    return () => ro.disconnect();
  }, [activeKey]);

  // Shrink on scroll: the pill follows the scroll as it happens. Any panel
  // tall enough to be the page counts, not only main: the Feed and Today's
  // columns scroll on their own, and scroll events do not bubble, so the
  // listener sits on the document in the capture phase. The value is written
  // straight to the pill each frame, never through React state.
  const onCompose = pathname.startsWith("/studio/compose");
  const openRef = useRef<() => void>(() => {});
  useEffect(() => {
    const pill = listRef.current;
    if (!pill) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let source: Element | null = null;
    let state = initialShrinkState(0);
    let target = 0;
    let shown = 0;
    let frame = 0;
    let last = 0;
    let lastScroll = 0;
    let settling = false;

    const draw = (p: number) => pill.style.setProperty("--shrink", p.toFixed(4));
    draw(0);

    function tick(now: number) {
      const dt = Math.min(64, now - (last || now));
      last = now;
      if (!settling && now - lastScroll > SETTLE_AFTER_MS) {
        settling = true;
        target = restingProgress(target);
        state = { ...state, progress: target };
      }
      // A first-order follow: each frame closes a share of the gap set by
      // elapsed time, so the pill trails the scroll by a few frames and
      // never outruns or overshoots it.
      const tau = settling ? SETTLE_TAU_MS : FOLLOW_TAU_MS;
      shown += (target - shown) * (1 - Math.exp(-dt / tau));
      if (Math.abs(target - shown) < 0.001) shown = target;
      draw(shown);
      if (shown === target && settling) {
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    function onScroll(e: Event) {
      const el = e.target === document ? document.scrollingElement : (e.target as Element);
      if (!el || !(el instanceof HTMLElement)) return;
      // A sideways track, a dropdown or a table is not the page.
      if (el.clientHeight < window.innerHeight * 0.5) return;
      if (el !== source) {
        source = el;
        state = { progress: state.progress, lastY: el.scrollTop };
        return;
      }
      if (el.scrollTop === state.lastY) return;
      state = nextShrinkState(state, el.scrollTop);
      target = state.progress;
      lastScroll = performance.now();
      settling = false;
      if (!frame) frame = requestAnimationFrame(tick);
    }

    // A new page opens at its top, so the bar opens out with it.
    openRef.current = () => {
      source = null;
      state = initialShrinkState(0);
      target = 0;
      settling = true;
      if (!frame && shown !== 0) frame = requestAnimationFrame(tick);
    };

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      if (frame) cancelAnimationFrame(frame);
      openRef.current = () => {};
    };
  }, [onCompose]);

  useEffect(() => {
    openRef.current();
  }, [pathname]);

  if (onCompose) return null;

  return (
    <nav
      ref={navRef}
      aria-label="App"
      className="app-tabs z-40 md:hidden"
    >
      <ul ref={listRef} className="app-tabs-pill relative grid grid-cols-5">
        <span ref={lensRef} aria-hidden className="app-tabs-lens" />
        {TABS.map(({ key, href, label, Icon }) => {
          const active = key === activeKey;
          return (
            <li key={key} data-tab={key} className="relative z-[1]">
              {/* The link fills its slot; the lens takes the slot. Inside, the
                  iOS bar's stack: 7px, a 26px icon, 4px, a 10px label, 7px,
                  which is the 54px lens exactly. */}
              <Link
                href={href}
                prefetch
                aria-current={key === routeKey ? "page" : undefined}
                onClick={() => setPending({ key, from: pathname })}
                className="focus-ring relative flex w-full flex-col items-center gap-1 rounded-[18px] py-[7px] text-ticker font-medium leading-none text-text"
              >
                <Icon size={26} strokeWidth={active ? 2.3 : 1.6} aria-hidden />
                <span>{label}</span>
                <LinkPending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
