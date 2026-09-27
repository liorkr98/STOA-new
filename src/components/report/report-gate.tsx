import Link from "next/link";
import { usd } from "@/lib/format";
import { BuyReportButton } from "@/components/wallet/buy-report-button";
import { SubscribeButton } from "@/components/wallet/subscribe-button";

export interface ReportGateData {
  reportId: string;
  access: "paid" | "subscribers";
  /** Paid pieces that subscribers may also open. */
  membersIncluded: boolean;
  price: number;
  subPrice: number | null;
  balance: number;
  isAuthed: boolean;
  subscribed: boolean;
  authorId: string;
  authorHandle: string;
  authorName: string;
  /** Minutes of reading past this point; a number from the server, never the words. */
  minutesLeft: number | null;
}

/**
 * Filler for the fading lines above the gate. It is not the body and is not
 * derived from it: a gated reader's page is built without the body, so the
 * fade is drawn from these words, blurred past reading. What it says is
 * irrelevant; what matters is that the page visibly goes on.
 */
const FILLER =
  "The argument continues with the numbers behind it, the conditions that would change the view, and the detail the opening only points at. Each section builds on the one before it, and the evidence is laid out in full so it can be checked rather than taken on trust.";

/**
 * The locked section: the page fades out into the way in, so a reader can see
 * there is more rather than conclude the piece has ended.
 *
 * Subscribe is the coral action. A paid piece's one-time unlock is ink on its
 * own and ghost beside Subscribe (a paid piece that members can also open).
 * A signed-out reader sees the real offer with its price, and signs in on the
 * way to it, landing back here.
 */
export function ReportGate({ gate }: { gate: ReportGateData }) {
  const next = `/report/${gate.reportId}`;
  const offersSubscribe = gate.access === "subscribers" || (gate.membersIncluded && Boolean(gate.subPrice));
  const offersUnlock = gate.access === "paid";

  const title =
    gate.access === "subscribers"
      ? "The rest is for subscribers."
      : `The rest of this piece is ${usd(gate.price)}.`;

  const more = gate.minutesLeft ? `${gate.minutesLeft} more ${gate.minutesLeft === 1 ? "minute" : "minutes"} of reading` : null;
  const note =
    gate.access === "subscribers"
      ? `${more ? `${more}, and` : "The full piece, and"} everything else ${gate.authorName} publishes for subscribers.`
      : offersSubscribe
        ? `${more ? `${more}. ` : ""}Unlock it once, or subscribe to ${gate.authorName}.`
        : `${more ? `${more}. ` : ""}One payment opens the full piece.`;

  return (
    <section id="report-gate" aria-label="Locked" className="relative mt-2 scroll-mt-24">
      <div aria-hidden className="pointer-events-none relative h-44 select-none overflow-hidden">
        <p className="stoa-prose stoa-prose--read blur-[5px]">{FILLER}</p>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--paper)_30%,transparent),var(--paper)_88%)]" />
      </div>

      <div className="relative -mt-12 flex flex-col items-center rounded-panel bg-surface-2 px-5 py-8 text-center sm:px-8">
        <h2 className="max-w-[24ch] font-display text-headline font-extrabold leading-[1.1] tracking-[-0.03em] text-text">
          {title}
        </h2>
        <p className="mt-2 max-w-[44ch] text-body text-text-mute">{note}</p>

        <div className="mt-6 flex w-full max-w-md flex-col gap-2.5 sm:flex-row sm:justify-center">
          {offersSubscribe ? (
            <div className="w-full sm:max-w-[15rem] sm:flex-1">
              <SubscribeButton
                analystId={gate.authorId}
                handle={gate.authorHandle}
                price={gate.subPrice}
                balance={gate.balance}
                isAuthed={gate.isAuthed}
                subscribed={gate.subscribed}
                signInNext={next}
              />
            </div>
          ) : null}
          {offersUnlock ? (
            <div className="w-full sm:max-w-[15rem] sm:flex-1">
              <BuyReportButton
                reportId={gate.reportId}
                price={gate.price}
                balance={gate.balance}
                isAuthed={gate.isAuthed}
                authorHandle={gate.authorHandle}
                variant={offersSubscribe ? "ghost" : "ink"}
              />
            </div>
          ) : null}
        </div>

        <p className="t-meta mt-4 max-w-[44ch]">
          The platform fee is shown as its own line at checkout.
          {gate.isAuthed ? null : (
            <>
              {" "}
              Already subscribed?{" "}
              <Link
                href={`/sign-in?next=${encodeURIComponent(next)}`}
                className="focus-ring rounded-chip text-text underline underline-offset-2 hover:no-underline"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
