import { stoaIconResponse } from "@/lib/pwa/icon-response";

export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" as const },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" as const },
  ];
}

export default function Icon({ id }: { id: string }) {
  return stoaIconResponse(id === "192" ? 192 : 512);
}
