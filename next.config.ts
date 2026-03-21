import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cloudflare Pages configuration
  images: {
    unoptimized: true,
  },
  // Fix Turbopack workspace root issue
  turbopack: {
    root: '.',
  },
};

export default nextConfig;
