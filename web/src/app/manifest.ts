import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Шинэ Ирээдүйн Эзэд",
    short_name: "Pi.mn",
    lang: "mn",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Manifest requires literal colors: globals.css light --brand / --bg.
    theme_color: "#1D4ED8",
    background_color: "#FAF9F6",
    icons: [
      {
        src: "/pwa-icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icons/maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
