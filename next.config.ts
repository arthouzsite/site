import type { NextConfig } from 'next'
import type { RemotePattern } from 'next/dist/shared/lib/image-config'
import { allowsTestOverrides } from './lib/test-overrides'

type Env = Readonly<Record<string, string | undefined>>

const BUILD_PHASE = 'phase-production-build'
const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i

/**
 * NEXT_PUBLIC_SITE_URL is inlined at build time (robots, sitemap and metadataBase are prerendered), so a production
 * build without a real origin would ship localhost URLs to search engines. Fails the build instead.
 */
export function assertProductionSiteUrl(env: Env, phase: string | undefined = env.NEXT_PHASE): void {
  if (env.NODE_ENV !== 'production' || phase !== BUILD_PHASE || allowsTestOverrides(env)) return
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim() ?? ''
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL must be set to the public origin (e.g. https://arthouz.example) before `next build`.')
  if (LOCAL_HOST.test(siteUrl)) {
    throw new Error(`NEXT_PUBLIC_SITE_URL is "${siteUrl}", a localhost URL; set it to the public origin before \`next build\`.`)
  }
}

/** Uploaded media is same-origin (`/media/...`), so only the seed's picsum placeholders need a remote pattern, and production must not allow them. */
export function buildRemotePatterns(env: Env): RemotePattern[] {
  return allowsTestOverrides(env)
    ? [{ protocol: 'https', hostname: 'picsum.photos' }, { protocol: 'https', hostname: 'fastly.picsum.photos' }]
    : []
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
  // Each Playwright harness builds into its own directory: .next/cache is the unstable_cache store, which otherwise leaks data across harness databases.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async redirects() {
    return LEGACY_REDIRECTS.map((redirect) => ({ ...redirect, permanent: true }))
  },
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'sharp', 'argon2'],
  devIndicators: false,
  images: {
    remotePatterns: buildRemotePatterns(process.env),
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === '1' && allowsTestOverrides(process.env),
  },
}

/** `next typegen` loads the config with the production-build phase too, but emits only type files. */
const isTypegenRun = (argv: readonly string[]) => argv.includes('typegen')

/** Next passes the phase explicitly; NEXT_PHASE is only set in the environment after compilation, so the guard keys on it. */
export default function configForPhase(phase: string): NextConfig {
  if (!isTypegenRun(process.argv)) assertProductionSiteUrl(process.env, phase)
  return nextConfig
}
