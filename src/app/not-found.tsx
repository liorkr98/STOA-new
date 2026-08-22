import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { StoaLogo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-5 text-center">
      <StoaLogo />
      <h1 className="t-display">404</h1>
      <p className="t-body">That page is not on the colonnade.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/feed" className={buttonClass("primary", "md")}>
          Explore research
        </Link>
        <Link href="/search" className={buttonClass("secondary", "md")}>
          Search analysts &amp; tickers
        </Link>
        <Link href="/" className={buttonClass("ghost", "md")}>
          Home
        </Link>
      </div>
    </div>
  );
}
