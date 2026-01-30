import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // In Next.js 15+, some old keys like 'eslint' outside might be moved or deprecated
  // but let's keep it simple.
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
