import { stoaIconResponse } from "@/lib/pwa/icon-response";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return stoaIconResponse(512);
}
