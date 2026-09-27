import type { ComponentProps } from "react";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { compact } from "@/lib/format";
import { cn } from "@/lib/design/cn";
import { Avatar } from "@/components/ui/avatar";
import { DisclosureBlock } from "@/components/ui/disclosure-block";
import { DyorBar } from "@/components/ui/dyor-bar";
import { StanceChip, ThemeChip, TickerChip } from "@/components/ui/chip";
import { ScrollFrame } from "@/components/layout/scroll-frame";
import { FollowButton } from "@/components/follow-button";
import { ShareMenu } from "@/components/share/share-menu";
import { ClipPendingPlayer } from "@/components/video/clip-pending";
import { ReportBody } from "@/components/editor/report-body";
import { ArchivedBanner } from "@/components/report/archived-banner";
import { AudioBrief } from "@/components/report/audio-brief";
import { EditedMarker } from "@/components/report/edited-marker";
import { FactCheckLayer } from "@/components/report/fact-check-layer";
import { ReportActions } from "@/components/report/report-actions";
import { ReportClip } from "@/components/report/report-clip";
import { ReportDiscussion } from "@/components/report/report-discussion";
import { ReportGate, type ReportGateData } from "@/components/report/report-gate";
import type { FactClaim } from "@/lib/ai/fact-check";
import type { ReportEdit } from "@/lib/db/report-edits";
import type { FeedCard, FeedComment } from "@/lib/feed/types";
import type { Direction } from "@/lib/types";

/** Headlines longer than this drop from the display size to the headline size. */
const DISPLAY_MAX_CHARS = 80;

export interface ReportViewData {
  id: string;
  archived: boolean;
  isAuthor: boolean;
  isAuthed: boolean;
  headline: string;
  dek: string | null;
  typeLabel: string;
  publishedAt: string;
  views: number;
  likes: number;
  liked: boolean;
  saved: boolean;
  author: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    verified: boolean;
  } | null;
  following: boolean;
  ticker: string | null;
  stance: Direction | null;
  /** The theme a publication without a ticker anchors on. */
  theme: string | null;
  edits: ReportEdit[];
  readMinutes: number | null;
  clip: ComponentProps<typeof ReportClip> | null;
  pendingClip: ComponentProps<typeof ClipPendingPlayer> | null;
  /** The reader may read the body. When false, `body` is null and `gate` is set. */
  canRead: boolean;
  body: string | null;
  claims: FactClaim[];
  /** Reader-safe: locked rows arrive as empty sealed shells or not at all. */
  cards: FeedCard[];
  gate: ReportGateData | null;
  disclosure: ComponentProps<typeof DisclosureBlock>;
  discussion: FeedComment[];
  /** Turns off the parts that need a live session and a real row (the /dev fixture). */
  fixture?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return d.getUTCFullYear() === new Date().getUTCFullYear() ? day : `${day} ${d.getUTCFullYear()}`;
}

/**
 * The publication page, in Direction B.
 *
 * Two columns on a desktop: the reading column (headline, byline, stance,
 * body, discussion) and the clip column (the video, then the trust panels),
 * each scrolling on its own inside a frame, so the clip stays beside the text
 * for the length of the read. Nothing is pinned with an offset.
 *
 * On a phone the columns are `display: contents`, which dissolves them so
 * their blocks can be ordered against each other: headline and byline, the
 * clip, the stance, the body, the trust panels, the discussion.
 *
 * The clip is public on purpose: it is how an analyst makes the case to
 * someone who has not paid. The depth below it is gated on the server; a
 * gated reader's page is built without the body, never with it hidden.
 */
export function ReportView({ data }: { data: ReportViewData }) {
  const long = data.headline.length > DISPLAY_MAX_CHARS;
  const hasMedia = Boolean(data.clip || data.pendingClip);
  const meta = [
    data.typeLabel,
    dateLabel(data.publishedAt),
    data.readMinutes ? `${data.readMinutes} min read` : null,
    data.views > 0 ? `${compact(data.views)} ${data.views === 1 ? "view" : "views"}` : null,
  ].filter(Boolean);

  return (
    <ScrollFrame className="scroll-area mx-auto w-full max-w-[var(--w-standard)] flex-col gap-7 overflow-y-auto pb-[calc(var(--tab-h)+var(--main-pad-y))] lg:flex-row lg:gap-12 lg:overflow-hidden lg:pb-0">
      <article className="scroll-area contents lg:order-1 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-8 lg:overflow-y-auto lg:pb-16">
        {/* Reading position, like a scrollbar. Its timeline is the nearest
          * scroller: the reading column, or the frame on a phone. */}
        <div className="reading-progress" aria-hidden />

        <header className="order-1 lg:order-none">
          {data.archived ? <ArchivedBanner reportId={data.id} isAuthor={data.isAuthor} /> : null}

          <h1
            dir="auto"
            className={cn(
              long ? "t-headline" : "t-display",
              "user-copy text-text [text-wrap:balance] lg:pt-4",
            )}
          >
            {data.headline}
          </h1>
          {data.dek ? (
            <p dir="auto" className="user-copy mt-4 text-title font-normal leading-[1.45] text-text-mute">
              {data.dek}
            </p>
          ) : null}

          {data.author ? (
            <div className="mt-6 flex items-center gap-3">
              <Link
                href={`/analyst/${data.author.handle}`}
                aria-label={data.author.displayName}
                className="focus-ring shrink-0 rounded-avatar"
              >
                <Avatar src={data.author.avatarUrl} name={data.author.displayName} size="md" />
              </Link>
              <div className="min-w-0 flex-1 leading-tight">
                <Link
                  href={`/analyst/${data.author.handle}`}
                  className="focus-ring flex w-fit max-w-full items-center gap-1.5 rounded-chip text-body font-semibold text-text hover:underline"
                >
                  <span className="user-copy truncate" dir="auto">
                    {data.author.displayName}
                  </span>
                  {data.author.verified ? (
                    <BadgeCheck size={14} aria-label="Verified" className="shrink-0 text-text" />
                  ) : null}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="num text-ticker text-text-mute">{meta.join(" · ")}</span>
                  {data.edits.length > 0 ? <EditedMarker edits={data.edits} /> : null}
                </div>
              </div>
              {data.isAuthor ? null : (
                <FollowButton
                  analystId={data.author.id}
                  initialFollowing={data.following}
                  isAuthed={data.isAuthed}
                  size="sm"
                  outline={Boolean(data.gate)}
                  className="shrink-0"
                />
              )}
            </div>
          ) : (
            <p className="num mt-6 text-ticker text-text-mute">{meta.join(" · ")}</p>
          )}
          {!data.author && data.edits.length > 0 ? (
            <div className="mt-3">
              <EditedMarker edits={data.edits} />
            </div>
          ) : null}
        </header>

        {/* The stance, quiet: a ticker and a direction, and the reader's own
            controls on the same line. Beneath the clip on a phone. */}
        <div className="order-3 flex flex-wrap items-center gap-2 lg:order-none">
          {data.ticker ? (
            <>
              <TickerChip ticker={data.ticker} href={`/markets/${encodeURIComponent(data.ticker)}`} />
              {data.stance ? <StanceChip direction={data.stance} /> : null}
            </>
          ) : data.theme ? (
            <ThemeChip label={data.theme} />
          ) : null}
          <div className="ms-auto flex items-center gap-1.5">
            {data.fixture ? null : (
              <ReportActions
                reportId={data.id}
                initialLikes={data.likes}
                initialLiked={data.liked}
                initialSaved={data.saved}
                isAuthed={data.isAuthed}
              />
            )}
            <ShareMenu
              target={{
                url: `/report/${data.id}`,
                title: data.headline,
                ticker: data.ticker ?? undefined,
              }}
            />
          </div>
        </div>

        <div className="order-4 min-w-0 lg:order-none">
          {data.canRead ? (
            <>
              {data.fixture ? null : <AudioBrief reportId={data.id} isAuthor={data.isAuthor} />}
              <ReportBody
                body={data.body}
                claims={data.claims}
                isAuthed={data.isAuthed}
                reportId={data.id}
                cards={data.cards}
                ticker={data.ticker}
              />
            </>
          ) : (
            <>
              <ReportBody body={null} cards={data.cards} ticker={data.ticker} />
              {data.gate ? <ReportGate gate={data.gate} /> : null}
            </>
          )}
        </div>

        <div className="order-6 lg:order-none">
          <ReportDiscussion reportId={data.id} comments={data.discussion} canPost={data.isAuthed} />
        </div>
      </article>

      <div
        className={cn(
          "scroll-area contents lg:order-2 lg:flex lg:min-h-0 lg:w-[380px] lg:shrink-0 lg:flex-col lg:gap-5 lg:overflow-y-auto lg:pb-16",
          hasMedia && "lg:pt-4",
        )}
      >
        {data.clip ? (
          <div className="order-2 lg:order-none">
            <ReportClip {...data.clip} />
          </div>
        ) : data.pendingClip ? (
          <div className="order-2 lg:order-none">
            <ClipPendingPlayer {...data.pendingClip} />
          </div>
        ) : null}
        <aside className="order-5 flex flex-col gap-3 lg:order-none" aria-label="About this publication">
          <DisclosureBlock {...data.disclosure} />
          <DyorBar />
          {data.claims.length > 0 ? (
            <FactCheckLayer
              claims={data.claims}
              className="t-meta flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-panel bg-surface-2 p-4"
            />
          ) : null}
        </aside>
      </div>
    </ScrollFrame>
  );
}
