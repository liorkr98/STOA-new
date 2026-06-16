import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { StoaLogo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-5 text-center">
      <StoaLogo />
      <h1 className="t-display">404</h1>
      <p className="t-body">That page is not on the colonnade.</p>
      <Link href="/" className={buttonClass("primary", "md")}>
        Back home
      </Link>
    </div>
  );
}
