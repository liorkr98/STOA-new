"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Compass, LineChart, Newspaper } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { LinkPending } from "@/components/layout/link-pending";
import { initialShrinkState, nextShrinkState } from "@/lib/nav/scroll-shrink";

const TABS = [
  { key: "feed", href: "/feed", label: "Feed", Icon: Clapperboard },
  { key: "today", href: "/home", label: "Today", Icon: Newspaper },
  { key: "explore", href: "/explore", label: "Explore", Icon: Compass },
  { key: "markets", href: "/markets", label: "Markets", Icon: LineChart },
] as const;

function tabActive(pathname: string, href: string) {
  if (href === "/feed") return pathname === "/feed" || pathname === "/";
  return pathname.startsWith(href);
}

/**
 * Phone chrome for the four reader surfaces. Desktop keeps the top links.
 * Explore's Feed overlay portals above this bar (z-70).
 *
 * A floating pill rather than a bar welded to the edge, so the page reads
 * behind and around it. It shrinks while the reader moves down the page and
 * comes back when they move up. The scroller is the layout's `main`, not the
 * window, which is why the listener is attached to an ancestor rather than a
 * scroll event on `document`.
 */
export function AppTabs() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [shrunk, setShrunk] = useState(false);

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

  return (
    <nav
      ref={navRef}
      aria-label="App"
      data-shrunk={shrunk ? "" : undefined}
      className="app-tabs z-40 md:hidden"
    >
      <ul className="app-tabs-pill grid grid-cols-4">
        {TABS.map(({ key, href, label, Icon }) => {
          const active = tabActive(pathname, href);
          return (
            <li key={key}>
              <Link
                href={href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring relative flex min-h-[3rem] flex-col items-center justify-center gap-0.5 rounded-full text-[10px] uppercase tracking-[0.14em]",
                  active ? "text-text" : "text-text-mute",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.6} aria-hidden />
                <span>{label}</span>
                {active ? (
                  <span aria-hidden className="absolute top-1 h-[1.5px] w-7 bg-[var(--ink)]" />
                ) : null}
                <LinkPending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
