import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server only: lets a phone on the local network load the dev
  // assets (http://<this machine's LAN IP>:3100).
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
