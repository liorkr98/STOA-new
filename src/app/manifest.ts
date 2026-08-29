import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stoa",
    short_name: "Stoa",
    description: "Think clearly. Invest better.",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    background_color: "#FAF8F4",
    theme_color: "#FAF8F4",
    id: "/",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
