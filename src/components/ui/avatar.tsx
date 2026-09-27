import type React from "react";
import Image from "next/image";
import { cn } from "@/lib/design/cn";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const px: Record<Size, number> = { xs: 22, sm: 28, md: 40, lg: 56, xl: 88 };

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * A person's face. Always a circle (--r-avatar), never a rounded square.
 * `size` takes a named step or an exact pixel size; `className` may override
 * the box with responsive width/height classes.
 */
export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name: string;
  size?: Size | number;
  className?: string;
}) {
  const dim = typeof size === "number" ? size : px[size];
  return (
    <span
      className={cn(
        "relative inline-flex h-[var(--av)] w-[var(--av)] shrink-0 items-center justify-center overflow-hidden rounded-avatar bg-surface-2 text-text-mute font-semibold",
        className,
      )}
      style={
        { "--av": `${dim}px`, fontSize: Math.max(10, Math.round(dim * 0.38)) } as React.CSSProperties
      }
    >
      {src ? (
        <Image src={src} alt={name} fill sizes={`${dim}px`} className="object-cover" />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
      {!src ? <span className="sr-only">{name}</span> : null}
    </span>
  );
}
