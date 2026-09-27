import { AnalystProfileView } from "@/components/profile/analyst-profile-view";
import { buildPublications, orderPublications } from "@/lib/profile/build-profile-view";
import type { VideoClip } from "@/lib/db/video-clips";
import type { Report } from "@/lib/types";

/**
 * Dev-only seeded storefront so the page can be reviewed without database
 * credentials. `?state=new` is the deliberately sparse new analyst (two
 * publications), `?state=one` a single publication, `?state=empty` none.
 * `?pinned=<id>` pins one, `?clip=processing` holds the lead's clip in
 * processing, `?viewer=self|subscribed` changes who is looking.
 * Fixture-only: fake durations, no thumbnails, no faces.
 */

const DAY = 86_400_000;
const NOW = Date.parse("2026-08-18T12:00:00Z");
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

function report(
  id: string,
  type: Report["type"],
  title: string,
  summary: string | null,
  ticker: string | null,
  daysAgo: number,
  views: number,
  body: string | null = null,
): Report {
  return {
    id,
    author_id: "fx-analyst",
    type,
    title,
    summary,
    body,
    status: "published",
    access: "free",
    price: null,
    ticker,
    likes: 0,
    views,
    comment_count: 0,
    published_at: ago(daysAgo),
    locked_at: ago(daysAgo),
    created_at: ago(daysAgo),
    position_disclosed: true,
    position_held: false,
    compensation_disclosed: true,
    compensation_tied: false,
    compensation_detail: null,
    views_certified: true,
  } as unknown as Report;
}

function clip(reportId: string, seconds: number, daysAgo: number): VideoClip {
  return {
    id: `clip-${reportId}`,
    report_id: reportId,
    creator_id: "fx-analyst",
    bunny_video_guid: `fixture-${reportId}`,
    playback_url: "",
    thumbnail_url: null,
    preview_url: null,
    caption_vtt_url: null,
    transcript: null,
    duration_seconds: seconds,
    status: "ready",
    fact_check_results: null,
    created_at: ago(daysAgo),
    published_at: ago(daysAgo),
  };
}

const LONG_BODY = "x".repeat(900);

const reports: Report[] = [
  report("r1", "research", "Blackwell demand is still under-modelled into the January quarter", "Hyperscaler capex guides imply a supply-constrained H1; the Street's unit assumptions have not caught up.", "NVDA", 2, 4820, LONG_BODY),
  report("r2", "short_post", "What the Strait of Hormuz headlines mean for crude this week", "A note on tanker rates, not on politics.", "XOM", 5, 2210),
  report("r3", "research", "TSMC's N2 ramp: the capex the market is not pricing", "The written thesis on 2027 wafer starts and what it does to gross margin.", "TSM", 9, 1330, LONG_BODY),
  report("r4", "research", "AMD's MI350 window is narrower than the bulls think", "The share-gain story depends on a software gap closing faster than it ever has.", "AMD", 40, 3910),
  report("r5", "research", "Micron: HBM pricing holds through the cycle", "Memory has never had a customer with this little price sensitivity.", "MU", 121, 5610),
  report("r6", "short_post", "Why the semis rally is broader than the Magnificent Seven", null, "SMH", 14, 980),
  report("r7", "research", "The case against Intel foundry, revisited", "Eighteen months on, the yield story has moved; the customer story has not.", "INTC", 60, 1740, LONG_BODY),
  report("r8", "research", "ASML: bookings trough was Q2", "The high-NA cadence sets up a 2027 order cycle the sell side is late to.", "ASML", 150, 2980),
  report("r9", "short_post", "Reading the SOX breadth chart", "A short note on breadth as a leading signal.", null, 21, 640),
];

const stances: Record<string, Report["stance"]> = { r1: "long", r4: "short", r5: "long", r8: "long" };

const clips: VideoClip[] = [
  clip("r1", 222, 2),
  clip("r2", 95, 5),
  clip("r4", 301, 40),
  clip("r5", 187, 121),
  clip("r6", 140, 14),
  clip("r8", 264, 150),
];

const staged: Report[] = reports.map((r) => ({ ...r, stance: stances[r.id] ?? null }));

export default async function DevProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; pinned?: string; clip?: string; viewer?: string }>;
}) {
  const { state, pinned, clip: clipMode, viewer } = await searchParams;
  const count = state === "empty" ? 0 : state === "one" ? 1 : state === "new" ? 2 : staged.length;
  const isNew = count < staged.length;
  // `?clip=processing` takes the lead's clip away and marks it as on the way,
  // the state every publication is in for the minute after publish.
  const processingId = clipMode === "processing" ? clips[0]?.report_id : undefined;

  const pubs = buildPublications({
    // The sparse states mix a video with a written piece, the usual first two.
    reports: count < staged.length ? staged.filter((r) => ["r3", "r1"].includes(r.id)).slice(0, count) : staged,
    clips: clips.filter((c) => c.report_id !== processingId),
    pendingClipIds: processingId ? new Set([processingId]) : undefined,
  });
  const ordered = orderPublications(pubs, pinned ?? null);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10">
      <AnalystProfileView
        handle={isNew ? "newanalyst" : "lenakw"}
        name={isNew ? "Dana Fixture" : "Lena Kowalczyk"}
        firstName={isNew ? "Dana" : "Lena"}
        initials={isNew ? "DF" : "LK"}
        avatarUrl={null}
        verified={!isNew}
        specialty={isNew ? "Semiconductor supply chains" : "Semiconductors and AI infrastructure"}
        bio={
          isNew
            ? "Former equipment analyst. Two publications in."
            : "Twelve years covering the semiconductor supply chain, most recently at a long-only fund."
        }
        isSelf={viewer === "self"}
        subscribed={viewer === "subscribed"}
        audienceLine={isNew ? "@newanalyst · 12 followers" : "@lenakw · 4.3K followers · 214 members"}
        {...ordered}
        analystId="fx-analyst"
        initialFollowing={false}
        isAuthed={false}
        subscribeLabel={isNew ? "Subscribe" : "Subscribe · from $12/mo"}
        plans={[]}
        balance={0}
      />
    </div>
  );
}
