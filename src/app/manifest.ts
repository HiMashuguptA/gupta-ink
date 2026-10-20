import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gupta Ink: stationery in minutes",
    short_name: "Gupta Ink",
    description: "Stationery from Gupta Enterprises, Kohima, delivered in under an hour.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#1f2a6e",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
