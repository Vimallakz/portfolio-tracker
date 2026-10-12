import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Portfolio Intelligence",
    short_name: "Portfolio",
    description: "Track your portfolio snapshots, returns, goals and signals.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard" },
      { name: "My Focus", url: "/focus" },
      { name: "Import CSV", url: "/import" },
    ],
  };
}
