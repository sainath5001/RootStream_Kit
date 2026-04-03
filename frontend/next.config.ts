import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lowers webpack heap pressure during `next build` (dev compile may still OOM on tight WSL RAM).
  experimental: {
    webpackMemoryOptimizations: true,
  },
  // Keep Next 16 happy when we customize webpack (dev) but still build with Turbopack.
  turbopack: {},
  webpack: (config) => {
    // RainbowKit pulls MetaMask SDK transitively; its browser bundle references React Native AsyncStorage.
    // We don't use it in this web app, so stub it out to avoid noisy "Module not found" warnings in dev.
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
