import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { VideoNodeView } from "@/components/editor/tiptap/nodes/video-node-view";

/**
 * videoNode -- subscriber-gated video (Part D / A12). Stores only our asset row
 * id + presentation attrs; playback always goes through GET /api/video/token
 * (canReadReport + plan rank), so the stream itself is gated, not just the UI.
 * minPlanRank enables per-block teasing: a cheaper report can show a locked
 * video with an upgrade chip (Part C per-block gating).
 */
export const VideoNode = Node.create({
  name: "videoNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      assetId: { default: null },
      caption: { default: "" },
      posterUrl: { default: null },
      aspectRatio: { default: "16:9" },
      minPlanRank: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-video-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-video-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },
});
