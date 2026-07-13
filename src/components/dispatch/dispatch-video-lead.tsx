import { FadeIn } from "@/components/motion/fade-in";
import { VideoCard } from "@/components/video/video-card";
import type { VideoCardData } from "@/lib/video/card-data";

/**
 * The Dispatch lead as video (Part 5.1). The single most important story of the
 * issue, so it earns an actually-playing muted preview (autoPreview) -- a rarer,
 * higher-stakes placement than the Discover grid, same logic applied to the seal.
 * Reuses the Part 4 VideoCard in its `lead` variant; no second component.
 */
export function DispatchVideoLead({ data }: { data: VideoCardData }) {
  return (
    <FadeIn>
      <article className="dispatch-section">
        <div className="dispatch-kicker">
          <span>The Lead</span>
        </div>
        <div className="mt-6">
          <VideoCard data={data} variant="lead" autoPreview />
        </div>
      </article>
    </FadeIn>
  );
}
