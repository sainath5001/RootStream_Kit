import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lowers webpack heap pressure during `next build` (dev compile may still OOM on tight WSL RAM).
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
