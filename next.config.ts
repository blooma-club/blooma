import type { NextConfig } from 'next'

// Dynamically allow R2 public base URL if provided
const remotePatterns: Array<{
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname: string;
}> = []
const r2Base = process.env.R2_PUBLIC_BASE_URL
if (r2Base) {
  try {
    const u = new URL(r2Base)
    remotePatterns.push({
      protocol: u.protocol.replace(':', '') as 'http' | 'https',
      hostname: u.hostname,
      port: u.port || undefined,
      pathname: '/**'
    })
  } catch (e) {
    console.warn('[next.config] Invalid R2_PUBLIC_BASE_URL:', r2Base)
  }
} else {
  // Fallback: add known static hostname (from current error) so dev works even if env var missing
  remotePatterns.push({
    protocol: 'https',
    hostname: 'pub-c28b43de22c5c20c8555e0c8f27ff352.r2.dev',
    pathname: '/**'
  })
}

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns,
  },
}

export default nextConfig
