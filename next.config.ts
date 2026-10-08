import type { NextConfig } from "next";

// The scene's assets (model, font, lighting) rarely change: browsers keep
// them a day, then use them while checking for a newer copy.
const ASSET_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return ["/models/:path*", "/fonts/:path*", "/hdri/:path*"].map(
      (source) => ({
        source,
        headers: [{ key: "Cache-Control", value: ASSET_CACHE }],
      }),
    );
  },
  // Dev server only: lets a phone on the local network load the dev assets
  // (http://<this machine's LAN IP>:3100).
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
