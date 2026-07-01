import { cn } from "@/lib/design/cn";

/**
 * Fixed layout, always three rows, always visible -- never collapsed,
 * never in an accordion. Each row is a fixed-format chip, not free text,
 * specifically so a creator cannot write persuasive copy into their own
 * disclosure. Ledger-card treatment even under a paywall scrim.
 *
 * Never accept a theme/color prop on this component. It is the one part
 * of the product explicitly not covered by creator branding controls.
 */
export function DisclosureBlock({
  holdsPosition,
  compensationTied,
  compensationDetail,
  className,
}: {
  holdsPosition: boolean;
  compensationTied: boolean;
  compensationDetail?: string;
  className?: string;
}) {
  return (
    <div className={cn("ledger-card divide-y divide-border p-0", className)}>
      <Row label="Position">
        <Chip tone={holdsPosition ? "neutral" : "quiet"}>
          {holdsPosition ? "Holds a position" : "No position"}
        </Chip>
      </Row>
      <Row label="Compensation">
        <div className="flex flex-col items-end gap-1">
          <Chip tone={compensationTied ? "neutral" : "quiet"}>
            {compensationTied ? "Compensation disclosed" : "Certified independent"}
          </Chip>
          {compensationTied && compensationDetail && (
            <p className="t-meta max-w-[28ch] text-right">{compensationDetail}</p>
          )}
        </div>
      </Row>
      <Row label="Views">
        <Chip tone="quiet">These are the creator&apos;s own views</Chip>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3.5">
      <span className="t-eyebrow shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Chip({ tone, children }: { tone: "neutral" | "quiet"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--r-tag)] border px-2 py-0.5 text-xs font-medium text-right",
        tone === "neutral" ? "border-border-strong text-text" : "border-border text-text-mute",
      )}
    >
      {children}
    </span>
  );
}
