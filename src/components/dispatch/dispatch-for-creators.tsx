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
        <p className="t-meta text-text-mute">
          For analysts
        </p>
        <h2 className="mt-3 font-display text-title font-semibold text-text">
          Your next piece could lead this page
        </h2>
        <p className="mx-auto mt-2 max-w-md text-body leading-relaxed text-text-mute">
          Publish conviction-backed research. The dispatch features the day&apos;s best work,
          chosen on merit, never bought.
        </p>
        <Link href="/become-analyst" className={`${buttonClass("ghost", "md")} mt-5`}>
          Start publishing
        </Link>
      </div>
    </section>
  );
}
