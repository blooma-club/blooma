import type { NextConfig } from 'next'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

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

// Add Google OAuth avatar images and AI service domains
remotePatterns.push(
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
    pathname: '/**'
  },
  {
    protocol: 'https',
    hostname: 'lh4.googleusercontent.com',
    pathname: '/**'
  },
  {
    protocol: 'https',
    hostname: 'lh5.googleusercontent.com',
    pathname: '/**'
  },
  {
    protocol: 'https',
    hostname: 'lh6.googleusercontent.com',
    pathname: '/**'
  },
  {
    protocol: 'https',
    hostname: 'img.clerk.com',
    pathname: '/**'
  },
  // FAL AI 이미지 도메인
  {
    protocol: 'https',
    hostname: 'fal.media',
    pathname: '/**'
  },
  {
    protocol: 'https',
    hostname: 'v3.fal.media',
    pathname: '/**'
  },
  {
    protocol: 'https',
    hostname: 'v3b.fal.media',
    pathname: '/**'
  },
  // 기타 AI 서비스 도메인들
  {
    protocol: 'https',
    hostname: 'replicate.delivery',
    pathname: '/**'
  },
  {
    protocol: 'https',
    hostname: 'pbxt.replicate.delivery',
    pathname: '/**'
  },
  // Midjourney CDN
  {
    protocol: 'https',
    hostname: 'cdn.midjourney.com',
    pathname: '/**'
  }
)

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Webpack 설정은 Turbopack을 사용하지 않을 때만 적용
  ...(process.env.NODE_ENV === 'production' && {
    webpack: (config) => {
      config.resolve = config.resolve || {}
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        punycode: require.resolve('punycode/'),
      }
      return config
    },
  }),
}

export default nextConfig
