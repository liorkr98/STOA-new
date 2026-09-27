import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge has to know the custom scales. Without this it read
// `text-ticker` as a colour and dropped the colour class beside it, which
// turned every small ink button's label ink-on-ink.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "headline", "title", "body", "ticker"],
      radius: ["button", "chip", "field", "panel", "inner", "avatar"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
