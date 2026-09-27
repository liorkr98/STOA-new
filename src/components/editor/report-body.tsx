import { parseDocument } from "@/lib/editor/document";
import { isTiptapDoc, parseTiptapDoc } from "@/lib/editor/tiptap/serialize";
import type { EditorBlock } from "@/lib/editor/types";
import { BlockEditor } from "@/components/editor/block-editor";
import { TiptapReportRenderer } from "@/components/editor/tiptap/report-renderer";
import { FactCheckedText } from "@/components/report/fact-check-layer";
import { ReportCard } from "@/components/report/report-cards";
import { interleaveCards, placedCardIds, plainParagraphs } from "@/lib/reports/reading";
import type { FactClaim } from "@/lib/ai/fact-check";
import type { FeedCard } from "@/lib/feed/types";

/**
 * The published body at the reading size, with the evidence cards inside it.
 *
 * Cards the analyst placed in a Tiptap body render where they were placed;
 * the rest follow the text. A plain-text body carries no placement, so its
 * cards are set between its paragraphs (see interleaveCards). Every card here
 * comes from the reader-safe deck: a locked card arrives as an empty sealed
 * shell, so nothing gated is in this markup.
 */
export function ReportBody({
  body,
  claims,
  isAuthed = false,
  reportId,
  cards = [],
  ticker = null,
}: {
  body: string | null;
  claims?: FactClaim[];
  isAuthed?: boolean;
  reportId?: string;
  cards?: FeedCard[];
  ticker?: string | null;
}) {
  if (!body?.trim()) return <CardRun cards={cards} ticker={ticker} />;

  if (isTiptapDoc(body)) {
    const json = parseTiptapDoc(body);
    const placed = placedCardIds(json);
    return (
      <div>
        <TiptapReportRenderer
          json={json}
          claims={claims}
          isAuthed={isAuthed}
          reportId={reportId}
          cards={cards}
          ticker={ticker}
        />
        <CardRun cards={cards.filter((c) => !placed.has(c.id))} ticker={ticker} />
      </div>
    );
  }

  if (!body.trimStart().startsWith("{")) {
    return (
      <div className="stoa-prose stoa-prose--read">
        {interleaveCards(plainParagraphs(body), cards).map((piece, i) =>
          piece.kind === "paragraph" ? (
            <p key={i} dir="auto" className="whitespace-pre-line">
              {claims && claims.length > 0 ? (
                <FactCheckedText text={piece.text} claims={claims} isAuthed={isAuthed} reportId={reportId} />
              ) : (
                piece.text
              )}
            </p>
          ) : (
            <ReportCard key={piece.card.id} card={piece.card} ticker={ticker} />
          ),
        )}
      </div>
    );
  }

  const doc = parseDocument(body);
  const blocks: EditorBlock[] = doc.blocks;

  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block) => (
        <section key={block.id}>
          <BlockEditor block={block} onChange={() => {}} readOnly claims={claims} isAuthed={isAuthed} />
        </section>
      ))}
      <CardRun cards={cards} ticker={ticker} />
    </div>
  );
}

function CardRun({ cards, ticker }: { cards: FeedCard[]; ticker: string | null }) {
  if (cards.length === 0) return null;
  return (
    <div className="stoa-prose stoa-prose--read">
      {cards.map((c) => (
        <ReportCard key={c.id} card={c} ticker={ticker} />
      ))}
    </div>
  );
}
