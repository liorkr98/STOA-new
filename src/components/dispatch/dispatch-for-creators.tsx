import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export function DispatchForCreators() {
  return (
    <section className="dispatch-section dispatch-for-creators">
      <h2 className="dispatch-section-label">For creators</h2>
      <p className="mb-5 max-w-prose text-sm text-text-mute leading-relaxed">
        Publish conviction-backed calls. Build your moat. Get featured in the next Dispatch when your
        work ranks among the day&apos;s best.
      </p>
      <Link href="/become-analyst" className={buttonClass("secondary", "sm")}>
        Start publishing
      </Link>
    </section>
  );
}
