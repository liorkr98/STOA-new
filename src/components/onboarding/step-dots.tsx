import { cn } from "@/lib/design/cn";

/** Dots read faster than a percentage bar for a short, known-length sequence. */
export function StepDots({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center justify-center gap-6">
      {steps.map((label, i) => (
        <li key={label} className="flex flex-col items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              i < current
                ? "bg-accent"
                : i === current
                  ? "bg-accent ring-4 ring-accent-weak"
                  : "bg-border",
            )}
          />
          <span
            className={cn(
              "t-eyebrow",
              i === current ? "text-accent" : "text-text-faint",
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}
