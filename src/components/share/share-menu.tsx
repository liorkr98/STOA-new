"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Mail, Share2, Smartphone } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * ShareMenu: share a report or profile to X, Facebook, LinkedIn, Reddit,
 * StockTwits, or email, plus copy-link and the native share sheet (the mobile
 * path to Instagram, WhatsApp, etc. -- Instagram has no web share URL, so
 * copy-link + native sheet is the honest way in). Plain intent URLs, no SDKs,
 * nothing loaded from third parties.
 */

export interface ShareTarget {
  /** Absolute URL preferred; a path is resolved against location.origin. */
  url: string;
  title: string;
  /** e.g. "NVDA" -- prefixes the StockTwits/X text with $NVDA. */
  ticker?: string;
}

interface Network {
  key: string;
  label: string;
  href: (u: string, t: string, ticker?: string) => string;
}

const NETWORKS: Network[] = [
  {
    key: "x",
    label: "X",
    href: (u, t, ticker) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(ticker ? `$${ticker} ${t}` : t)}&url=${encodeURIComponent(u)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
  },
  {
    key: "reddit",
    label: "Reddit",
    href: (u, t) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`,
  },
  {
    key: "stocktwits",
    label: "StockTwits",
    href: (u, t, ticker) =>
      `https://stocktwits.com/widgets/share?body=${encodeURIComponent(`${ticker ? `$${ticker} ` : ""}${t} ${u}`)}`,
  },
];

export function ShareMenu({
  target,
  className,
  label = "Share",
}: {
  target: ShareTarget;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function absoluteUrl(): string {
    if (/^https?:/i.test(target.url)) return target.url;
    return `${window.location.origin}${target.url.startsWith("/") ? "" : "/"}${target.url}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: target.title, url: absoluteUrl() });
      setOpen(false);
    } catch {
      /* user dismissed */
    }
  }

  const itemClass =
    "flex w-full items-center gap-2 rounded-[var(--radius-btn)] px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 focus-ring";

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border bg-surface px-3 text-sm text-text-mute transition-colors hover:border-border-strong hover:text-text"
      >
        <Share2 size={15} />
        {label}
      </button>

      {open && (
        <div
          role="menu"
          className="menu-pop absolute right-0 z-30 mt-1 w-52 rounded-[var(--radius-card)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
        >
          {NETWORKS.map((n) => (
            <a
              key={n.key}
              role="menuitem"
              href={n.href(absoluteUrl(), target.title, target.ticker)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              {n.label}
            </a>
          ))}
          <a
            role="menuitem"
            href={`mailto:?subject=${encodeURIComponent(target.title)}&body=${encodeURIComponent(`${target.title}\n\n${absoluteUrl()}`)}`}
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Mail size={14} className="text-text-faint" /> Email
          </a>
          {canNative && (
            <button type="button" role="menuitem" onClick={() => void nativeShare()} className={itemClass}>
              <Smartphone size={14} className="text-text-faint" /> More (Instagram, WhatsApp...)
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => void copyLink()} className={itemClass}>
            {copied ? (
              <Check size={14} className="text-[var(--up)]" />
            ) : (
              <Link2 size={14} className="text-text-faint" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
