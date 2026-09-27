"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { BadgeCheck, Check } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { ClipPendingThumb } from "@/components/video/clip-pending";
import type { Direction } from "@/lib/types";
import type { Plan } from "@/lib/db/plans";
import { FollowButton } from "@/components/follow-button";
import { ShareMenu } from "@/components/share/share-menu";
import { TierPickerModal } from "@/components/profile/tier-picker-modal";
import { StanceChip, ThemeChip, TickerChip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { FilterPicker } from "@/components/explore/filter-picker";
import { PlayDisc } from "@/components/today/today-bits";
import { labelCase } from "@/lib/design/label";

/** One publication as the storefront renders it: a picture tile or a written tile. */
export interface ProfilePublication {
  id: string;
  href: string;
  /** "video" when a clip exists (ready or still processing); "written" renders as a typographic tile. */
  kind: "video" | "written";
  /** The clip exists but is still being prepared; the tile keeps its frame and says so. */
  processing?: boolean;
  typeLabel: "VIDEO" | "BRIEF" | "THESIS";
  /** The publication's own ticker and, beside it, its stance (anchoring rule). */
  ticker: string | null;
  direction: Direction | null;
  /** Theme or sector tag for publications with no ticker; null when nothing is stored. */
  themeTag: string | null;
  badge: string;
  title: string;
  deck: string | null;
  duration: string | null;
  thumbnailUrl: string | null;
  dateISO: string;
  dateLabel: string;
  /** Filter key: the ticker when there is one, the theme tag otherwise. */
  subject: string | null;
}

export interface ProfileSubject {
  key: string;
  count: number;
}

export interface AnalystProfileViewProps {
  handle: string;
  name: string;
  firstName: string;
  initials: string;
  avatarUrl: string | null;
  verified: boolean;
  /** One line on what this analyst covers. */
  specialty: string;
  bio: string | null;
  isSelf: boolean;

  /**
   * The one place on the platform either number is shown: "@lenakw · 4.3K
   * followers · 214 members". Members is the paying-subscriber count and is
   * opt-in from the Storefront, so it is absent unless the analyst turned it on.
   */
  audienceLine: string;

  /** The pinned publication, or the newest. */
  lead: ProfilePublication | null;
  leadLabel: "Latest" | "Pinned";
  /** Everything, newest first, lead included. */
  publications: ProfilePublication[];
  /** Tickers and themes this analyst covers, with counts. Empty below two. */
  subjects: ProfileSubject[];
  /** Publication types used. Empty below two. */
  types: ProfilePublication["typeLabel"][];

  // Interactivity
  analystId: string;
  initialFollowing: boolean;
  /** The viewer already pays this analyst. */
  subscribed?: boolean;
  isAuthed: boolean;
  subscribeLabel: string;
  plans: Plan[];
  balance: number;
  /** Per-analyst storefront theming (scoped accent + font pairing vars). */
  storefrontStyle?: CSSProperties;
  texture?: boolean;
}

const PAGE = 24;

const TYPE_NAMES: Record<ProfilePublication["typeLabel"], string> = {
  VIDEO: "Videos",
  BRIEF: "Briefs",
  THESIS: "Theses",
};

/** The ticker and its stance, or the theme when there is no ticker. Nothing when neither is stored. */
function Tags({ p, className }: { p: ProfilePublication; className?: string }) {
  if (!p.ticker && !p.themeTag) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {p.ticker ? <TickerChip ticker={p.ticker} /> : null}
      {p.ticker && p.direction ? <StanceChip direction={p.direction} /> : null}
      {!p.ticker && p.themeTag ? <ThemeChip label={labelCase(p.themeTag)} /> : null}
    </div>
  );
}

/** "Thesis · Cards · Aug 21, 2026": the type, what else it carries, and when. */
function metaLine(p: ProfilePublication): string {
  const type = labelCase(p.typeLabel);
  const extras = p.badge
    .split(" · ")
    .filter((b) => b !== p.typeLabel && b !== "NOTE" && !(b === "VIDEO" && p.kind === "video"))
    .map(labelCase);
  return [type, ...extras, p.dateLabel].join(" · ");
}

/**
 * The clip's frame: the real poster, the analyst's colour while a poster is
 * still being made, or the processing frame while the clip itself is. Only
 * ever drawn for a publication that has a clip.
 */
function Frame({
  p,
  analystId,
  className,
  play = false,
  eager = false,
}: {
  p: ProfilePublication;
  analystId: string;
  className?: string;
  play?: boolean;
  eager?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-panel bg-surface-2", className)}>
      {p.processing ? (
        <ClipPendingThumb />
      ) : (
        <>
          <ClipThumb src={p.thumbnailUrl} seed={analystId} loading={eager ? "eager" : "lazy"} />
          {play ? <PlayDisc /> : null}
          {p.duration ? <span className="today-duration num">{p.duration}</span> : null}
        </>
      )}
    </div>
  );
}

/**
 * The lead. With a clip: the picture and, beside it, the headline, the stance
 * and when. Without one: no frame at all, the headline across the width.
 */
function Lead({ p, label, analystId }: { p: ProfilePublication; label: string; analystId: string }) {
  const text = (
    <div className="min-w-0">
      <p className="t-meta">{label}</p>
      <h2 dir="auto" className="user-copy t-headline mt-2 text-text [text-wrap:balance]">
        <Link href={p.href} className="focus-ring rounded-inner hover:underline">
          {p.title}
        </Link>
      </h2>
      {p.deck ? (
        <p dir="auto" className="user-copy mt-3 line-clamp-3 max-w-[60ch] text-body text-text-mute">
          {p.deck}
        </p>
      ) : null}
      <Tags p={p} className="mt-4" />
      <p className="t-meta mt-3">{metaLine(p)}</p>
    </div>
  );
  if (p.kind !== "video") {
    return <section aria-label={`${label} publication`}>{text}</section>;
  }
  return (
    <section
      aria-label={`${label} publication`}
      className="grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-10"
    >
      <Link
        href={p.href}
        tabIndex={-1}
        aria-hidden
        className="focus-ring block rounded-panel"
      >
        <Frame p={p} analystId={analystId} play eager className="aspect-[16/10]" />
      </Link>
      {text}
    </section>
  );
}

/** A video: the frame, then its headline, stance and when. */
function PictureTile({ p, analystId }: { p: ProfilePublication; analystId: string }) {
  return (
    <article className="min-w-0">
      <Link href={p.href} tabIndex={-1} aria-hidden className="focus-ring block rounded-panel">
        <Frame p={p} analystId={analystId} className="aspect-[4/5]" />
      </Link>
      <h3 dir="auto" className="user-copy t-title mt-3 line-clamp-3 text-text">
        <Link href={p.href} className="focus-ring rounded-inner hover:underline">
          {p.title}
        </Link>
      </h3>
      <Tags p={p} className="mt-2" />
      <p className="t-meta mt-2">{metaLine(p)}</p>
    </article>
  );
}

/**
 * A written piece has no picture, so its tile is type: the headline set large
 * on a card, with the deck under it. It is as tall as its words and no taller,
 * so it never becomes an empty frame waiting for an image.
 */
function WrittenTile({ p }: { p: ProfilePublication }) {
  return (
    <article className="relative min-w-0 rounded-panel border border-border bg-surface p-4 transition-colors hover:border-border-strong md:p-5">
      <p className="t-meta">{metaLine(p)}</p>
      <h3
        dir="auto"
        className="user-copy mt-2 line-clamp-5 font-display text-title font-extrabold text-text"
      >
        <Link href={p.href} className="focus-ring rounded-inner after:absolute after:inset-0 hover:underline">
          {p.title}
        </Link>
      </h3>
      {p.deck ? (
        <p dir="auto" className="user-copy mt-2.5 line-clamp-3 text-body text-text-mute">
          {p.deck}
        </p>
      ) : null}
      <Tags p={p} className="mt-3" />
    </article>
  );
}

/**
 * Everything they have published. The lead stays out while nothing is
 * chosen, since it sits just above; once a subject or a type is chosen the
 * grid is every match, lead included. The two filters sit beside the
 * heading as quiet menus, the same control Explore uses.
 */
function Archive({
  publications,
  lead,
  subjects,
  types,
  firstName,
  analystId,
}: {
  publications: ProfilePublication[];
  lead: ProfilePublication | null;
  subjects: ProfileSubject[];
  types: ProfilePublication["typeLabel"][];
  firstName: string;
  analystId: string;
}) {
  const [subject, setSubject] = useState<string | null>(null);
  const [type, setType] = useState<ProfilePublication["typeLabel"] | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const filtered = Boolean(subject || type);
  const shown = useMemo(
    () =>
      publications.filter(
        (p) =>
          (filtered || p.id !== lead?.id) &&
          (!subject || p.subject === subject) &&
          (!type || p.typeLabel === type),
      ),
    [publications, lead, subject, type, filtered],
  );

  if (publications.length < 2) return null;

  // A filter earns its place once there is enough to narrow.
  const narrowable = publications.length >= 6;
  const typeOptions = types.map((t) => TYPE_NAMES[t]);

  return (
    <section aria-label={`More from ${firstName}`}>
      <SectionHeading title={`More from ${firstName}`}>
        {narrowable && (subjects.length > 0 || types.length > 0) ? (
          <div className="flex flex-wrap items-center gap-5">
            {subjects.length > 0 ? (
              <FilterPicker
                label="Subject"
                searchLabel="Search subjects"
                value={subject}
                options={subjects.map((s) => s.key)}
                onChange={(v) => {
                  setSubject(v);
                  setLimit(PAGE);
                }}
              />
            ) : null}
            {types.length > 0 ? (
              <FilterPicker
                label="Type"
                searchLabel="Search types"
                value={type ? TYPE_NAMES[type] : null}
                options={typeOptions}
                onChange={(v) => {
                  setType(types.find((t) => TYPE_NAMES[t] === v) ?? null);
                  setLimit(PAGE);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </SectionHeading>
      <div className="mt-6 grid grid-cols-2 items-start gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-6 xl:gap-y-10">
        {shown.slice(0, limit).map((p) =>
          p.kind === "video" ? (
            <PictureTile key={p.id} p={p} analystId={analystId} />
          ) : (
            <WrittenTile key={p.id} p={p} />
          ),
        )}
      </div>
      {shown.length > limit ? (
        <div className="mt-10 flex justify-center">
          <Button variant="ghost" onClick={() => setLimit((n) => n + PAGE)}>
            Show more
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The top of the storefront: the face, the name at display size, what they
 * cover, the audience line, and the actions. Shared with the Storefront
 * editor's preview, which passes `compact` for its narrow pane and inert
 * copies of the actions.
 */
export function StorefrontHero({
  name,
  avatarUrl,
  verified,
  specialty,
  bio,
  audienceLine,
  actions,
  footer,
  compact = false,
}: {
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  specialty: string;
  bio: string | null;
  audienceLine: string;
  actions: React.ReactNode;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      aria-label={name}
      className={cn(
        "grid grid-cols-1 items-center gap-5",
        !compact && "pt-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 md:pt-8",
      )}
    >
      <Avatar src={avatarUrl} name={name} size={88} className={compact ? undefined : "sm:h-[128px] sm:w-[128px]"} />
      <div className="min-w-0">
        <h1 dir="auto" className={cn(compact ? "t-headline" : "t-display", "break-words text-text")}>
          {name}
          {verified ? (
            <BadgeCheck
              size={compact ? 20 : 26}
              strokeWidth={2.2}
              className="ml-2 inline-block align-[0.1em] text-text"
              aria-label="Identity verified"
            />
          ) : null}
        </h1>
        <p dir="auto" className="user-copy mt-3 text-title font-medium text-text">
          {specialty}
        </p>
        {bio ? (
          <p dir="auto" className="user-copy mt-2 line-clamp-3 max-w-[60ch] text-body text-text-mute">
            {bio}
          </p>
        ) : null}
        <p className="t-meta num mt-3">{audienceLine}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">{actions}</div>
        {footer}
      </div>
    </section>
  );
}

export function AnalystProfileView(props: AnalystProfileViewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div
      className={cn("pb-[calc(var(--tab-h)+var(--main-pad-y))] md:pb-16", props.texture && "paper-texture")}
      style={props.storefrontStyle}
    >
      <StorefrontHero
        name={props.name}
        avatarUrl={props.avatarUrl}
        verified={props.verified}
        specialty={props.specialty}
        bio={props.bio}
        audienceLine={props.audienceLine}
        actions={
          <>
            {props.isSelf ? null : props.subscribed ? (
              <Link href="/subscriptions" className={buttonClass("ghost", "lg", "w-full sm:w-auto")}>
                <Check size={16} strokeWidth={2.4} aria-hidden />
                Subscribed
              </Link>
            ) : (
              <Button variant="coral" size="lg" className="w-full sm:w-auto" onClick={() => setModalOpen(true)}>
                {props.subscribeLabel}
              </Button>
            )}
            {props.isSelf ? null : (
              <FollowButton
                analystId={props.analystId}
                initialFollowing={props.initialFollowing}
                isAuthed={props.isAuthed}
                quiet
                className="flex-1 sm:flex-none"
              />
            )}
            <ShareMenu
              target={{ url: `/analyst/${props.handle}`, title: `${props.name} on Stoa` }}
              size="lg"
              className={props.isSelf ? undefined : "flex-1 sm:flex-none"}
            />
          </>
        }
        footer={
          props.isSelf ? (
            <p className="t-meta mt-4">
              This is how visitors see your profile.{" "}
              <Link href="/studio/branding" className="focus-ring rounded-inner text-text underline">
                Edit your storefront
              </Link>
            </p>
          ) : null
        }
      />

      <div className="mt-12 flex flex-col gap-14 md:mt-16 md:gap-20">
        {props.lead ? (
          <Lead p={props.lead} label={props.leadLabel} analystId={props.analystId} />
        ) : (
          <p className="t-meta">Nothing published yet.</p>
        )}
        <Archive
          publications={props.publications}
          lead={props.lead}
          subjects={props.subjects}
          types={props.types}
          firstName={props.firstName}
          analystId={props.analystId}
        />
      </div>

      {modalOpen && (
        <TierPickerModal
          plans={props.plans}
          handle={props.handle}
          firstName={props.firstName}
          balance={props.balance}
          isAuthed={props.isAuthed}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
