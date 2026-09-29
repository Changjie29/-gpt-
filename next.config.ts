import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node self-hosting reads local environment variables. Sites/Vinext continues
  // to use the real Cloudflare binding through its separate Vite configuration.
  turbopack: {
    resolveAlias: { 'cloudflare:workers': './lib/node-runtime-env.ts' },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'cloudflare:workers': './lib/node-runtime-env.ts',
    };
    return config;
  },
};

export default nextConfig;
