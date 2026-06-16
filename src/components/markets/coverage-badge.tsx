import { ChartBar } from "@phosphor-icons/react/dist/ssr";

/**
 * The differentiating ticker badge: how much verified Stoa coverage a symbol
 * has. Neutral styling; this is not a sentiment signal.
 */
export function StoaCoverageBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-mute">
      <ChartBar size={13} weight="bold" className="text-accent" />
      {count > 0 ? (
        <>
          <span className="num text-text">{count}</span> on Stoa
        </>
      ) : (
        "No coverage yet"
      )}
    </span>
  );
}
