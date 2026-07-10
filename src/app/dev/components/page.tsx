"use client";

import { useState } from "react";
import { SealStamp } from "@/components/ui/seal-stamp";
import { TrackScoreBadge } from "@/components/ui/track-score-badge";
import { StatusChip } from "@/components/ui/status-chip";
import { DisclosureBlock } from "@/components/ui/disclosure-block";
import { DyorBar } from "@/components/ui/dyor-bar";
import { LockConfirmModal } from "@/components/ui/lock-confirm-modal";
import { PaywallGate } from "@/components/ui/paywall-gate";
import { FactCheckLayer, FactCheckedText } from "@/components/report/fact-check-layer";
import { RoleSwitcher } from "@/components/layout/role-switcher";
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

export default function ComponentPreviewPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper p-12">
      <p className="t-eyebrow mb-8">Scratch preview -- delete before ship</p>

      <p className="t-eyebrow mb-4">TrackScoreBadge</p>
      <div className="flex flex-wrap items-center gap-8 mb-12">
        <TrackScoreBadge handle="maren_vos" score={78} hitRate={0.64} size="sm" />
        <TrackScoreBadge handle="maren_vos" score={78} hitRate={0.64} size="md" />
        <TrackScoreBadge handle="maren_vos" score={32} hitRate={0.3} size="md" />
        <TrackScoreBadge handle="new_analyst" score={null} size="md" />
        <TrackScoreBadge handle="maren_vos" score={78} hitRate={0.64} sampleSize={14} size="lg" />
        <TrackScoreBadge handle="new_analyst" score={55} hitRate={0.5} sampleSize={4} size="lg" />
        <TrackScoreBadge handle="new_analyst" score={null} size="lg" />
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

      <p className="t-eyebrow mb-4">LockConfirmModal</p>
      <div className="mb-12">
        <Button onClick={() => setModalOpen(true)}>Open lock modal</Button>
        <LockConfirmModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          ticker="NVDA"
          targetPrice={142}
          horizonDate={new Date("2026-09-01")}
          onConfirm={async () => new Promise((r) => setTimeout(r, 600))}
        />
      </div>

      <p className="t-eyebrow mb-4">RoleSwitcher (gated off in real nav today, see docs)</p>
      <div className="flex gap-4 mb-12">
        <RoleSwitcher current="investor" />
        <RoleSwitcher current="analyst" />
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

      <div className="flex flex-wrap items-end gap-10">
        <div className="flex flex-col items-center gap-3">
          <SealStamp status="locked" date={new Date("2026-05-03")} size="sm" />
          <span className="t-meta">locked sm</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <SealStamp status="locked" date={new Date("2026-05-03")} size="md" />
          <span className="t-meta">locked md</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <SealStamp status="locked" date={new Date("2026-05-03")} size="lg" />
          <span className="t-meta">locked lg</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <SealStamp status="hit" date={new Date("2026-06-18")} size="lg" />
          <span className="t-meta">hit lg</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <SealStamp status="miss" date={new Date("2026-06-18")} size="lg" />
          <span className="t-meta">miss lg</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <SealStamp status="locked" date={new Date()} size="lg" animate />
          <span className="t-meta">locked lg (animate)</span>
        </div>
      </div>
    </div>
  );
}
