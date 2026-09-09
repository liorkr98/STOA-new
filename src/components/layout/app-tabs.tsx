"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Compass, LineChart, Newspaper, PenLine } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { LinkPending } from "@/components/layout/link-pending";
import { initialShrinkState, nextShrinkState } from "@/lib/nav/scroll-shrink";

const TABS = [
  { key: "feed", href: "/feed", label: "Feed", Icon: Clapperboard },
  { key: "today", href: "/home", label: "Today", Icon: Newspaper },
  { key: "create", href: "/studio/compose", label: "Create", Icon: PenLine },
  { key: "explore", href: "/explore", label: "Explore", Icon: Compass },
  { key: "markets", href: "/markets", label: "Markets", Icon: LineChart },
] as const;

function tabActive(pathname: string, href: string) {
  if (href === "/feed") return pathname === "/feed" || pathname === "/";
  if (href === "/studio/compose") return pathname.startsWith("/studio/compose");
  return pathname.startsWith(href);
}

/**
 * Phone chrome for the reader surfaces, plus Create in the middle.
 * Desktop keeps the top links. Explore's Feed overlay portals above this bar (z-70).
 *
 * Hidden on Compose so the editor owns the viewport. A floating pill rather
 * than a bar welded to the edge, so the page reads behind and around it.
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

  if (pathname.startsWith("/studio/compose")) return null;

  return (
    <nav
      ref={navRef}
      aria-label="App"
      data-shrunk={shrunk ? "" : undefined}
      className="app-tabs z-40 md:hidden"
    >
      <ul className="app-tabs-pill grid grid-cols-5">
        {TABS.map(({ key, href, label, Icon }) => {
          const active = tabActive(pathname, href);
          return (
            <li key={key}>
              <Link
                href={href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring relative mx-0.5 flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-[10px] text-[11px] font-medium uppercase tracking-[0.12em]",
                  active ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.75} aria-hidden />
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
