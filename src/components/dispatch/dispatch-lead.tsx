import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { MoatBadge } from "@/components/ui/moat-badge";
import { FadeIn } from "@/components/motion/fade-in";
import type { DispatchStory } from "@/lib/dispatch/types";
import { cn } from "@/lib/design/cn";

function formatTarget(p: DispatchStory["prediction"]) {
  if (!p?.target_price) return null;
  return `$${p.target_price.toFixed(2)}`;
}

export function DispatchLead({
  story,
  align = "center",
}: {
  story: DispatchStory;
  align?: "center" | "start";
}) {
  const { report, author, prediction, headline, dek } = story;
  const ticker = (report.ticker ?? prediction?.ticker ?? "").toUpperCase();
  const target = formatTarget(prediction);
  const centered = align === "center";

  return (
    <FadeIn className="dispatch-lead">
      <article>
        <Link href={`/report/${report.id}`} className="group block focus-ring rounded-[var(--r-btn)]">
          <h2
            className={cn(
              "dispatch-lead-headline group-hover:text-accent transition-colors duration-[var(--dur-2)]",
              !centered && "dispatch-lead-headline--start text-left",
            )}
          >
            {headline}
          </h2>
          {dek && (
            <p className={cn("dispatch-lead-dek mt-4", !centered && "dispatch-lead-dek--start text-left mx-0")}>
              {dek}
            </p>
          )}
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border pt-5">
          <Link
            href={`/analyst/${author.handle}`}
            className="flex items-center gap-3 focus-ring rounded-[var(--r-btn)]"
          >
            <Avatar src={author.avatar_url} name={author.display_name} size="md" />
            <span className="text-sm font-semibold text-text">{author.display_name}</span>
          </Link>
          <MoatBadge handle={author.handle} score={author.score || null} size="md" />
          {ticker && (
            <span className="num text-xs font-medium uppercase tracking-wide text-text-mute">
              {ticker}
            </span>
          )}
          {target && (
            <span className="num text-xs text-text-faint">
              Target {target}
            </span>
          )}
          <Link
            href={`/report/${report.id}`}
            className={cn(
              "ml-auto inline-flex items-center gap-1 text-sm font-medium text-accent",
              "hover:underline",
            )}
          >
            Read
            <ArrowRight size={14} />
          </Link>
        </div>
      </article>
    </FadeIn>
  );
}
