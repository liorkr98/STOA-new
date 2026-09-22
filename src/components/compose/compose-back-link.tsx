"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { canPopHistory } from "@/lib/nav/back";

/**
 * Compose's way back. Pops the in-app stack when there is a page behind this
 * one (Feed → Create, Studio → Compose, picker → editor). Falls through to
 * Studio when Compose was opened as the first page. The leave-guard in the
 * editor honours `data-stoa-back` so unsaved work still gets the stay/leave
 * dialog, then the same pop.
 */
export function ComposeBackLink({
  fallback = "/studio",
  children = "Back",
  className,
}: {
  fallback?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <a
      href={fallback}
      data-stoa-back=""
      className={cn(
        "num focus-ring flex shrink-0 items-center gap-1.5 rounded-[var(--radius-btn)] text-[10px] uppercase tracking-[0.16em] text-text-mute transition-colors hover:text-text",
        className,
      )}
      onClick={(e) => {
        if (!canPopHistory()) return;
        e.preventDefault();
        router.back();
      }}
    >
      <ArrowLeft size={14} aria-hidden />
      {children}
    </a>
  );
}
