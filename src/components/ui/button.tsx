import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/design/cn";

/**
 * The one button. Pill-shaped, in three looks from Direction B plus two quiet
 * ones for secondary chrome:
 *
 *   ink    filled ink, the default action
 *   ghost  outlined, for the second action beside an ink or coral one
 *   coral  THE live or actionable thing: Subscribe, Follow, Publish, the one
 *          primary action on a screen. At most one per view. Black text,
 *          because white on coral fails contrast (3.1:1).
 *   plain  text-only, no border (toolbars, dismissals)
 *   subtle a grey well, for toggles and filters
 */
export type ButtonVariant = "ink" | "ghost" | "coral" | "plain" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-button " +
  "transition-[transform,background-color,border-color,color,filter,box-shadow] duration-[var(--dur-1)] ease-[var(--ease-out)] " +
  "active:scale-[0.97] focus-ring disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

const variants: Record<ButtonVariant, string> = {
  ink: "bg-accent text-accent-ink hover:brightness-[1.12]",
  ghost:
    "bg-transparent text-text shadow-[inset_0_0_0_1.5px_var(--border)] hover:shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:bg-surface-2",
  coral: "bg-coral hover:brightness-[1.05]",
  plain: "bg-transparent text-text hover:bg-surface-2",
  subtle: "bg-surface-2 text-text hover:bg-[var(--accent-weak)]",
};

// Explicit heights: button height is a design decision, not a spacing step.
const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-ticker",
  md: "h-10 px-[18px] text-body",
  lg: "h-12 px-6 text-body",
};

export function buttonClass(
  variant: ButtonVariant = "ink",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ink", size = "md", ...props }, ref) => (
    <button ref={ref} className={buttonClass(variant, size, className)} {...props} />
  ),
);

Button.displayName = "Button";
