import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/design/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-surface border border-border rounded-[var(--radius-card)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
