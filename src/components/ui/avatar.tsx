import Image from "next/image";
import { cn } from "@/lib/design/cn";

type Size = "sm" | "md" | "lg" | "xl";

const px: Record<Size, number> = { sm: 28, md: 40, lg: 56, xl: 88 };

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name: string;
  size?: Size;
  className?: string;
}) {
  const dim = px[size];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-card)] bg-surface-2 border border-border text-text-mute font-semibold",
        className,
      )}
      style={{ width: dim, height: dim, fontSize: dim * 0.36 }}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes={`${dim}px`} className="object-cover" />
      ) : (
        <span className="num">{initials(name)}</span>
      )}
    </span>
  );
}
