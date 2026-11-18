import type { MetadataRoute } from "next";

// The web app manifest (Step 10). It tells the phone the app's name, colors and icons,
// so "Add to Home screen" / "Install app" opens Decider full screen like a normal app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Decider",
    short_name: "Decider",
    description: "What should I do right now? Your buddy decides.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f2",
    theme_color: "#7c5cff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}