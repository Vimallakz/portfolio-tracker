import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Offline detection for the banner, and retry of navigations and server actions once back online.
    useOffline: true,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          // Always re-check, so a new service worker reaches installed apps on their next launch.
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
