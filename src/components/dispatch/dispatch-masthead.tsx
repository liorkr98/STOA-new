import { cn } from "@/lib/design/cn";
import { formatDispatchDateline } from "@/lib/dispatch/cycle";

export function DispatchMasthead({
  issueNumber,
  dateIso,
  readMinutes,
  personalized,
  className,
}: {
  issueNumber: number;
  dateIso: string;
  readMinutes: number;
  personalized?: boolean;
  className?: string;
}) {
  const dateline = personalized
    ? `Your dispatch, ${formatDispatchDateline(dateIso).replace(/, \d{4}$/, "")}`
    : formatDispatchDateline(dateIso);

  return (
    <header className={cn("dispatch-masthead text-center", className)}>
      <p className="dispatch-wordmark" aria-label="Stoa">
        S T O A
      </p>
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
