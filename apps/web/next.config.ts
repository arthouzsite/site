import type { NextConfig } from 'next'
import type { RemotePattern } from 'next/dist/shared/lib/image-config'

const isProduction = process.env.NODE_ENV === 'production'
const imageHost = process.env.IMAGE_HOST?.trim() ?? ''

const remotePatterns: RemotePattern[] = [
  { protocol: 'https', hostname: 'picsum.photos' },
  { protocol: 'https', hostname: 'fastly.picsum.photos' },
  ...(imageHost ? [{ protocol: 'https' as const, hostname: imageHost }] : []),
]

/** Section-level redirects from the old site's URL scheme; old detail slugs do not map one to one. */
const LEGACY_REDIRECTS = [
  { source: '/exhibition/:path*', destination: '/exhibitions' },
  { source: '/artist/:path*', destination: '/artists' },
  { source: '/fair/:path*', destination: '/fairs' },
  { source: '/news/:path+', destination: '/news' },
  { source: '/contact', destination: '/visit' },
] as const

const nextConfig: NextConfig = {
  async redirects() {
    return LEGACY_REDIRECTS.map((redirect) => ({ ...redirect, permanent: true }))
  },
  transpilePackages: ['@arthouz/shared'],
  devIndicators: false,
  images: {
    remotePatterns,
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === '1' && (!isProduction || process.env.ALLOW_TEST_OVERRIDES === '1'),
  },
}

export default nextConfig
