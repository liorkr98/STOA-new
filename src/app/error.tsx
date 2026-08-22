"use client";

import Link from "next/link";
import { StoaLogo } from "@/components/brand/logo";
import { ErrorPanel } from "@/components/errors/error-panel";

/**
 * Last-resort boundary. Each route group has its own error.tsx that keeps that
 * group's chrome; this one only catches what those cannot -- an error thrown by
 * a group layout itself -- so it renders with no layout around it and has to
 * carry its own header and footer links, or the reader is stranded.
 */
export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg text-text">
      <header className="border-b border-border px-5 py-4">
        <Link href="/" aria-label="Stoa home" className="focus-ring inline-flex rounded-[var(--radius-btn)]">
          <StoaLogo />
        </Link>
      </header>
      <main className="flex-1">
        <ErrorPanel reset={reset} />
      </main>
      <footer className="border-t border-border px-5 py-4">
        <nav aria-label="Site" className="flex flex-wrap justify-center gap-x-5 gap-y-2 t-body">
          <Link href="/home" className="focus-ring text-text-mute hover:text-text">Today</Link>
          <Link href="/feed" className="focus-ring text-text-mute hover:text-text">Feed</Link>
          <Link href="/explore" className="focus-ring text-text-mute hover:text-text">Explore</Link>
          <Link href="/markets" className="focus-ring text-text-mute hover:text-text">Markets</Link>
        </nav>
      </footer>
    </div>
  );
}
