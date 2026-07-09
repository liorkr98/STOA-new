import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/**
 * Analyst recruitment, clearly separated from the editorial flow: a bordered
 * band after the issue ends, never blended mid-story (dispatch spec).
 */
export function DispatchForCreators() {
  return (
    <section className="dispatch-section dispatch-for-creators">
      <div className="border-y border-border bg-surface/50 px-6 py-8 text-center sm:px-10">
        <p className="t-eyebrow text-text-mute">
          For analysts
        </p>
        <h2 className="mt-3 font-display text-xl font-semibold text-text">
          Your next call could lead this page
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-mute">
          Publish conviction-backed research. Build a public Track Score the market cannot argue
          with. The dispatch features the day&apos;s best work, ranked, never bought.
        </p>
        <Link href="/become-analyst" className={`${buttonClass("secondary", "md")} mt-5`}>
          Start publishing
        </Link>
      </div>
    </section>
  );
}
