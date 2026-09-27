import { cn } from "@/lib/design/cn";

/**
 * Fixed layout, always three rows, always visible -- never collapsed,
 * never in an accordion. Each row is a fixed-format chip, not free text,
 * specifically so a creator cannot write persuasive copy into their own
 * disclosure. Drawn as a grey well on every page, even under a paywall scrim,
 * in the same shape for every analyst.
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
    <section aria-label="Disclosure" className={cn("rounded-panel bg-surface-2 p-4", className)}>
      <h2 className="text-body font-semibold text-text">Disclosure</h2>
      <div className="mt-3 flex flex-col gap-3">
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
              <p className="t-meta max-w-[28ch] text-left sm:text-right">{compensationDetail}</p>
            )}
          </div>
        </Row>
        <Row label="Views">
          <Chip tone="quiet">These are the analyst&apos;s own views</Chip>
        </Row>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="t-meta shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Chip({ tone, children }: { tone: "neutral" | "quiet"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip bg-surface px-2.5 py-0.5 text-ticker font-medium text-left sm:text-right",
        tone === "neutral" ? "text-text" : "text-text-mute",
      )}
    >
      {children}
    </span>
  );
}
