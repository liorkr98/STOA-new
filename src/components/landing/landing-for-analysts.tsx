import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export function LandingForAnalysts() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 text-center">
        <p className="t-eyebrow text-text-mute">For analysts</p>
        <h2 className="font-display mx-auto mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-text sm:text-3xl" style={{ textWrap: "balance" }}>
          Your next call could lead the front page
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-text-mute">
          Publish conviction-backed research. Set your own subscription and per-report prices
          and keep 90%. Build a permanent, public record of calls the market has already graded.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link href="/become-analyst" className={buttonClass("primary", "lg")}>
            Start publishing
          </Link>
          <Link href="/pricing" className={buttonClass("ghost", "lg")}>
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
