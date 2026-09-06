import { StudioEditor } from "@/components/editor/studio-editor";
import type { Report } from "@/lib/types";
import { DevPrivateShell } from "../_private-shell";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

/**
 * Dev-only. The compose workspace mounted the way the real page mounts it:
 * from an async server component, under a loading boundary, so that a
 * router refresh (what every successful save causes, through revalidatePath)
 * replays the same path it takes on /studio/compose. The stamp below changes
 * on every refresh, which proves the refresh happened; the step the creator
 * is on must not.
 */
export default async function DevComposeRefreshPage() {
  await new Promise((r) => setTimeout(r, 250));
  const stamp = new Date().toISOString();
  const draft = {
    id: "dev-refresh",
    type: "call",
    title: "Blackwell demand is still under-modelled into the January quarter",
    summary: "The supply ceiling moved.",
    body: null,
    access: "free",
    ticker: "NVDA",
    primary_tag: "semiconductors",
    secondary_tags: [],
  } as unknown as Report;

  return (
    <div className="w-full">
      <DevPrivateShell>
        <div className="breakout-main">
          <StudioEditor
            analystReportPrice={null}
            initialDraft={draft}
            initialCards={[]}
            hasVideoClip
            aiCredits={40}
            plans={[]}
          />
        </div>
      </DevPrivateShell>
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 pt-6">
        <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint" data-stamp>
          Rendered {stamp}
        </span>
        <RefreshButton />
      </div>
    </div>
  );
}
