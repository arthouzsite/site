import type { NextConfig } from 'next'
import type { RemotePattern } from 'next/dist/shared/lib/image-config'

type Env = Readonly<Record<string, string | undefined>>

const BUILD_PHASE = 'phase-production-build'
const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i

/** Test harnesses (visual, a11y, admin e2e) build with a localhost origin and opt in with ALLOW_TEST_OVERRIDES=1. */
const allowsTestOverrides = (env: Env) => env.NODE_ENV !== 'production' || env.ALLOW_TEST_OVERRIDES === '1'

/**
 * NEXT_PUBLIC_SITE_URL is inlined at build time (robots, sitemap and metadataBase are prerendered), so a production
 * build without a real origin would ship localhost URLs to search engines. Fails the build instead.
 */
export function assertProductionSiteUrl(env: Env, phase: string | undefined = env.NEXT_PHASE): void {
  if (env.NODE_ENV !== 'production' || phase !== BUILD_PHASE || env.ALLOW_TEST_OVERRIDES === '1') return
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim() ?? ''
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL must be set to the public origin (e.g. https://arthouz.example) before `next build`.')
  if (LOCAL_HOST.test(siteUrl)) {
    throw new Error(`NEXT_PUBLIC_SITE_URL is "${siteUrl}", a localhost URL; set it to the public origin before \`next build\`.`)
  }
}

/** Seed images come from picsum, which production must not allow; IMAGE_HOST is the real bucket/CDN host. */
export function buildRemotePatterns(env: Env): RemotePattern[] {
  const imageHost = env.IMAGE_HOST?.trim() ?? ''
  return [
    ...(allowsTestOverrides(env)
      ? [{ protocol: 'https' as const, hostname: 'picsum.photos' }, { protocol: 'https' as const, hostname: 'fastly.picsum.photos' }]
      : []),
    ...(imageHost ? [{ protocol: 'https' as const, hostname: imageHost }] : []),
  ]
}

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
    remotePatterns: buildRemotePatterns(process.env),
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === '1' && allowsTestOverrides(process.env),
  },
}

/** Next passes the phase explicitly; NEXT_PHASE is only set in the environment after compilation, so the guard keys on it. */
export default function configForPhase(phase: string): NextConfig {
  assertProductionSiteUrl(process.env, phase)
  return nextConfig
}
