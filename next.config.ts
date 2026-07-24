import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow development access from network IP for mobile testing
  allowedDevOrigins: ['192.168.1.13']
};

export default nextConfig;
