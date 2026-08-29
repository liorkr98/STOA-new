import { stoaIconResponse } from "@/lib/pwa/icon-response";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return stoaIconResponse(180);
}
