import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    incomingRequests: true,
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "1000mb",
    },
  },
  reactStrictMode: false,

  turbopack: {
    resolveAlias: {
      fs: "node:fs",
      path: "node:path",
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side configuration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
