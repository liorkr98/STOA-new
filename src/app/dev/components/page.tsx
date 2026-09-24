"use client";

import { EditedMarker } from "@/components/report/edited-marker";
import { EditedFlag } from "@/components/report/edited-flag";
import type { ReportEdit } from "@/lib/db/report-edits";
import { StatusChip } from "@/components/ui/status-chip";
import { DisclosureBlock } from "@/components/ui/disclosure-block";
import { DyorBar } from "@/components/ui/dyor-bar";
import { PaywallGate } from "@/components/ui/paywall-gate";
import { FactCheckLayer, FactCheckedText } from "@/components/report/fact-check-layer";
import { Button } from "@/components/ui/button";
import type { FactClaim } from "@/lib/ai/fact-check";

const sampleClaims: FactClaim[] = [
  {
    text: "Nvidia's data center revenue grew 112% year over year",
    type: "Yahoo-Verified",
    confidence: "high",
    yahooCheck: { match: true, detail: "Matches Q2 FY26 10-Q, data center segment." },
  },
  {
    text: "the setup into the next print looks asymmetric",
    type: "Opinion",
  },
  {
    text: "gross margins could expand another 200 basis points",
    type: "Unverified",
    note: "No source cited for this specific projection.",
    confidence: "low",
  },
  {
    text: "the stock has never traded this cheap relative to forward earnings",
    type: "Yahoo-Disputed",
    note: "Forward P/E was lower in both 2022 and 2019.",
    yahooCheck: { match: false, detail: "Historical P/E data contradicts this claim." },
  },
];

/** What the public marker can honestly show, in each of its shapes. */
const EDITS: ReportEdit[] = [
  {
    id: "e2",
    editedAt: "2026-08-29T14:32:00.000Z",
    sections: ["headline", "thesis"],
    titleBefore: "Blackwell demand is under-modelled into the January quarter",
    titleAfter: "Blackwell demand is still under-modelled into the January quarter",
    dekBefore: null,
    dekAfter: null,
  },
  {
    id: "e1",
    editedAt: "2026-08-27T09:04:00.000Z",
    sections: ["dek", "cards", "tags"],
    titleBefore: null,
    titleAfter: null,
    dekBefore: "The supply ceiling moved.",
    dekAfter: "The supply ceiling moved. Consensus is still modelling the old one.",
  },
];

export default function ComponentPreviewPage() {

  return (
    <div className="min-h-screen bg-paper p-12">
      <p className="t-eyebrow mb-8">Scratch preview -- delete before ship</p>

      <p className="t-eyebrow mb-4">EditedMarker (on the publication) and EditedFlag (in a list)</p>
      <div className="flex flex-wrap items-center gap-6 mb-12">
        <span className="flex items-center gap-2">
          <span className="t-meta">@ana_petrova · 3 days ago</span>
          <EditedMarker edits={EDITS} />
        </span>
        <EditedFlag editedAt="2026-08-29T14:32:00.000Z" />
      </div>

      <p className="t-eyebrow mb-4">StatusChip</p>
      <div className="flex flex-wrap items-center gap-4 mb-12">
        <StatusChip status="draft" />
        <StatusChip status="open" resolvesAt={new Date("2026-08-15")} />
        <StatusChip status="hit" />
        <StatusChip status="miss" />
      </div>

      <p className="t-eyebrow mb-4">DisclosureBlock</p>
      <div className="grid max-w-md gap-4 mb-12">
        <DisclosureBlock holdsPosition={false} compensationTied={false} />
        <DisclosureBlock
          holdsPosition
          compensationTied
          compensationDetail="Sponsored coverage as part of an ongoing IR agreement."
        />
      </div>

      <p className="t-eyebrow mb-4">DyorBar</p>
      <div className="max-w-md mb-12">
        <DyorBar />
      </div>

      <p className="t-eyebrow mb-4">PaywallGate (single CTA, real-world case)</p>
      <div className="max-w-2xl mb-12">
        <PaywallGate
          previewText="Nvidia's data center revenue accelerated again this quarter, and the setup into the next print looks asymmetric. The read-through for the broader AI capex cycle is the part most investors are still underpricing, and here's why the entry point matters more than the headline number..."
          onUnlock={<Button variant="secondary" className="w-full">Unlock this report -- $4</Button>}
          onSubscribe={null}
          isAuthed={false}
          loginHref="/sign-in"
        />
      </div>

      <p className="t-eyebrow mb-4">PaywallGate (both CTAs, if access model allowed it)</p>
      <div className="max-w-2xl mb-12">
        <PaywallGate
          onUnlock={<Button variant="secondary" className="w-full">Unlock this report -- $4</Button>}
          onSubscribe={<Button variant="secondary" className="w-full">Subscribe to @maren_vos -- $12/mo</Button>}
          isAuthed={false}
          loginHref="/sign-in"
        />
      </div>

      <p className="t-eyebrow mb-4">FactCheckLayer</p>
      <div className="max-w-2xl mb-12">
        <FactCheckLayer claims={sampleClaims} />
        <div className="t-body-editorial whitespace-pre-wrap mt-4">
          <FactCheckedText
            isAuthed
            text={
              "Nvidia's data center revenue grew 112% year over year, well ahead of consensus. " +
              "the setup into the next print looks asymmetric given how positioning has shifted. " +
              "Management hinted gross margins could expand another 200 basis points into next year, though " +
              "the stock has never traded this cheap relative to forward earnings on a historical basis."
            }
            claims={sampleClaims}
          />
        </div>
      </div>
    </div>
  );
}
