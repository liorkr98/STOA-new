import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/design/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-[var(--radius-btn)] " +
  "transition-[transform,background-color,border-color,color,filter] duration-[var(--dur-1)] ease-[var(--ease-out)] " +
  "active:scale-[0.97] focus-ring disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-[1.06]",
  secondary:
    "bg-surface text-text border border-border hover:border-border-strong hover:bg-surface-2",
  ghost: "bg-transparent text-text hover:bg-surface-2",
  subtle: "bg-surface-2 text-text hover:opacity-80",
};

// Heights are arbitrary px, not scale steps: this app's @theme maps the spacing
// scale onto a non-linear ramp (--space-8 = 64px), so `h-8` would render a 64px
// "small" button. Explicit px keeps button heights immune to that ramp.
const sizes: Record<ButtonSize, string> = {
  sm: "h-[34px] px-3 text-[0.8125rem]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
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
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button ref={ref} className={buttonClass(variant, size, className)} {...props} />
  ),
);

Button.displayName = "Button";
