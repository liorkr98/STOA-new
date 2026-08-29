import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-start justify-center gap-3 px-5">
      <p className="t-eyebrow">Offline</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">You are offline.</h1>
      <p className="text-sm leading-relaxed text-text-mute">
        Stoa needs a connection to load calls and clips. Reconnect, then open the Feed again.
      </p>
      <Link href="/feed" className={buttonClass("primary", "md")}>
        Open Feed
      </Link>
    </div>
  );
}
