import type { NextConfig } from 'next'
import type { RemotePattern } from 'next/dist/shared/lib/image-config'

const isProduction = process.env.NODE_ENV === 'production'
const imageHost = process.env.IMAGE_HOST?.trim() ?? ''

const remotePatterns: RemotePattern[] = [
  { protocol: 'https', hostname: 'picsum.photos' },
  { protocol: 'https', hostname: 'fastly.picsum.photos' },
  ...(imageHost ? [{ protocol: 'https' as const, hostname: imageHost }] : []),
]

const nextConfig: NextConfig = {
  transpilePackages: ['@arthouz/shared'],
  devIndicators: false,
  images: {
    remotePatterns,
    unoptimized: !isProduction && process.env.NEXT_IMAGE_UNOPTIMIZED === '1',
  },
}

export default nextConfig
