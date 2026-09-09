"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Clapperboard, Compass, LineChart, Newspaper, PenLine } from "lucide-react";
import { LinkPending } from "@/components/layout/link-pending";
import { initialShrinkState, nextShrinkState } from "@/lib/nav/scroll-shrink";

const TABS = [
  { key: "feed", href: "/feed", label: "Feed", Icon: Clapperboard },
  { key: "today", href: "/home", label: "Today", Icon: Newspaper },
  { key: "create", href: "/studio/compose", label: "Create", Icon: PenLine },
  { key: "explore", href: "/explore", label: "Explore", Icon: Compass },
  { key: "markets", href: "/markets", label: "Markets", Icon: LineChart },
] as const;

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
  const [shrunk, setShrunk] = useState(false);
  // The tab just tapped, so the lens sets off before the route has changed.
  // Remembered with the path it was tapped on: once the route moves, the
  // route decides again, with no effect needed to forget the tap.
  const [pending, setPending] = useState<{ key: string; from: string } | null>(null);

  const routeKey = TABS.find((t) => tabActive(pathname, t.href, t.key))?.key ?? null;
  const activeKey = pending && pending.from === pathname ? pending.key : routeKey;

  // Place the lens over the current link. The first placement is instant;
  // every later one travels. Width is set, not animated: the capsules are
  // within a few pixels of each other, and only transform moves.
  useLayoutEffect(() => {
    const list = listRef.current;
    const lens = lensRef.current;
    if (!list || !lens) return;
    let placed = lens.dataset.placed === "";
    const place = () => {
      const link = activeKey ? list.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`) : null;
      if (!link) {
        lens.style.opacity = "0";
        return;
      }
      const l = list.getBoundingClientRect();
      const r = link.getBoundingClientRect();
      // Read in the list's own frame, unscaled: the shrink transform scales
      // both rects equally, so the ratio to the list's width is exact.
      const scale = l.width / list.offsetWidth || 1;
      const x = (r.left - l.left) / scale;
      const w = r.width / scale;
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

  useEffect(() => {
    const scroller = navRef.current
      ?.closest("[data-app-shell]")
      ?.querySelector("main") as HTMLElement | null;
    if (!scroller) return;

    let state = initialShrinkState(scroller.scrollTop);
    let frame = 0;

    function read() {
      frame = 0;
      const el = scroller as HTMLElement;
      const next = nextShrinkState(state, el.scrollTop);
      if (next.shrunk !== state.shrunk) setShrunk(next.shrunk);
      state = next;
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(read);
    }

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  if (pathname.startsWith("/studio/compose")) return null;

  return (
    <nav
      ref={navRef}
      aria-label="App"
      data-shrunk={shrunk ? "" : undefined}
      className="app-tabs z-40 md:hidden"
    >
      <ul ref={listRef} className="app-tabs-pill relative grid grid-cols-5">
        <span ref={lensRef} aria-hidden className="app-tabs-lens" />
        {TABS.map(({ key, href, label, Icon }) => {
          const active = key === activeKey;
          return (
            <li key={key} className="relative z-[1] flex items-center justify-center">
              {/* Sized by its content, not its column: the lens takes this
                  link's box, so the highlight hugs the icon and label with
                  the same air all round. */}
              <Link
                href={href}
                prefetch
                data-tab={key}
                aria-current={key === routeKey ? "page" : undefined}
                onClick={() => setPending({ key, from: pathname })}
                className="focus-ring relative inline-flex flex-col items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.1em] text-text"
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
