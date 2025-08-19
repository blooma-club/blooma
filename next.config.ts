import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // TEMP: allow production builds despite existing lint errors. Remove after cleanup.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
