import { cn } from "@/lib/design/cn";
import { formatDispatchDateline } from "@/lib/dispatch/cycle";
import type { DispatchViewMode } from "@/lib/dispatch/types";

export function DispatchMasthead({
  issueNumber,
  dateIso,
  readMinutes,
  personalized,
  mode = "public",
  className,
}: {
  issueNumber: number;
  dateIso: string;
  readMinutes: number;
  personalized?: boolean;
  mode?: DispatchViewMode;
  className?: string;
}) {
  const dateLabel = formatDispatchDateline(dateIso).replace(/, \d{4}$/, "");

  const dateline =
    mode === "home" && personalized
      ? `Your briefing · ${dateLabel}`
      : personalized
        ? `Your dispatch · ${dateLabel}`
        : formatDispatchDateline(dateIso);

  return (
    <header className={cn("dispatch-masthead text-center", className)}>
      <p className="dispatch-wordmark" aria-label="Stoa">
        S T O A
      </p>
      <p className="dispatch-edition-label">Dispatch</p>
      <div className="dispatch-rule" aria-hidden />
      <p className="dispatch-dateline num">
        Issue №{issueNumber}
        <span className="dispatch-dateline-sep" aria-hidden>
          {" "}
          ·{" "}
        </span>
        {dateline}
        <span className="dispatch-dateline-sep" aria-hidden>
          {" "}
          ·{" "}
        </span>
        {readMinutes} min read
      </p>
    </header>
  );
}
