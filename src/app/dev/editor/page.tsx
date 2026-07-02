import { StudioEditor } from "@/components/editor/studio-editor";

/** Dev-only preview of the compose editor without the studio auth gate.
 * Same purpose as /dev/components: verifying layout and interaction states. */
export default function EditorPreviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <StudioEditor analystReportPrice={12} initialDraft={null} aiCredits={40} />
    </div>
  );
}
