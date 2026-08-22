import { VideoCard } from "@/components/video/video-card";
import type { VideoCardData } from "@/lib/video/card-data";

/**
 * Video grid (Part 4.1): 1 col mobile, 2 col small, 3 col desktop.
 * Browsable and boundaried -- not an infinite vertical swipe. The first item is
 * not special here (the Dispatch owns the lead treatment, Part 5).
 */
export function VideoGrid({ videos }: { videos: VideoCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <VideoCard key={v.id} data={v} />
      ))}
    </div>
  );
}
