import Link from "next/link";
import { StoaLogo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";

export function ClosedPreview({ invalidInvite }: { invalidInvite?: boolean }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-start justify-center gutter-x py-16">
      <StoaLogo />
      <h1 className="t-headline mt-8">Stoa is in private preview</h1>
      <p className="t-body mt-3 text-text-mute">
        {invalidInvite
          ? "That invite link is not valid. If you already have an account, sign in. If you were sent a new link, open that one."
          : "Only people with an invite link, and people who already have an account, can come in."}
      </p>
      <Link href="/sign-in" className={buttonClass("ink", "lg", "mt-8")}>
        Sign in
      </Link>
    </div>
  );
}
