import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/design/cn";

/**
 * A section heading as Direction B draws it: a Bricolage headline, an
 * optional one-line note in muted Inter, and an optional "See all" link.
 * No rule, no eyebrow, no uppercase.
 */
export function SectionHeading({
  title,
  note,
  href,
  linkLabel = "See all",
  as: Tag = "h2",
  size = "headline",
  children,
  className,
}: {
  title: ReactNode;
  note?: ReactNode;
  href?: string;
  linkLabel?: string;
  as?: "h1" | "h2" | "h3";
  /** headline for page sections, title for a section inside a card. */
  size?: "headline" | "title";
  /** Controls placed on the right, before the link. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-1", className)}>
      <div className="min-w-0">
        <Tag className={size === "headline" ? "t-headline" : "t-title"}>{title}</Tag>
        {note ? <p className="t-meta mt-1">{note}</p> : null}
      </div>
      {children || href ? (
        <div className="flex shrink-0 items-center gap-4">
          {children}
          {href ? (
            <Link href={href} className="text-body font-medium text-text-mute hover:text-text focus-ring rounded-chip">
              {linkLabel}
              <span aria-hidden> →</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
