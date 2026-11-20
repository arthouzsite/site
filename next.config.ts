import type { NextConfig } from 'next'
import type { RemotePattern } from 'next/dist/shared/lib/image-config'
import { cmsPath, INTERNAL_CMS_PATH } from './lib/cms-path'
import { DEFAULT_MEDIA_URL_BASE } from './lib/media-base'
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

/** Media links are `${MEDIA_URL_BASE}/<key>` (the public CDN unless overridden); `next/image` must accept that host. A `/media` base needs none. */
function mediaBasePatterns(env: Env): RemotePattern[] {
  const base = env.MEDIA_URL_BASE?.trim() || DEFAULT_MEDIA_URL_BASE
  if (!/^https?:\/\//i.test(base)) return []
  let url: URL
  try {
    url = new URL(base)
  } catch {
    return []
  }
  const protocol = url.protocol === 'http:' ? 'http' : 'https'
  return [{ protocol, hostname: url.hostname, pathname: `${url.pathname.replace(/\/+$/, '')}/**` }]
}

/** The media CDN host, plus the seed's picsum placeholders, which production must not allow. */
export function buildRemotePatterns(env: Env): RemotePattern[] {
  const placeholders: RemotePattern[] = allowsTestOverrides(env)
    ? [{ protocol: 'https', hostname: 'picsum.photos' }, { protocol: 'https', hostname: 'fastly.picsum.photos' }]
    : []
  return [...placeholders, ...mediaBasePatterns(env)]
}

/** Section-level redirects from the old site's URL scheme; old detail slugs do not map one to one. */
const LEGACY_REDIRECTS = [
  { source: '/exhibition/:path*', destination: '/exhibitions' },
  { source: '/artist/:path*', destination: '/artists' },
  { source: '/fair/:path*', destination: '/fairs' },
  { source: '/news/:path+', destination: '/news' },
  { source: '/contact', destination: '/visit' },
] as const

type Rewrite = { source: string; destination: string }

/** A path no route serves, so a request sent there ends at the site's not-found page. */
const HIDDEN_PATH = '/cms-not-here'

/**
 * Serves the CMS at its unguessable public path and answers the route folder's own name (`/admin`) as not found.
 * The hiding rule comes first: `beforeFiles` rules chain, and a hidden request must not reach the second rule.
 */
export function cmsRewrites(publicPath: string = cmsPath()): Rewrite[] {
  if (publicPath === INTERNAL_CMS_PATH) return []
  return [
    { source: `/${INTERNAL_CMS_PATH}/:path*`, destination: HIDDEN_PATH },
    { source: `/${publicPath}/:path*`, destination: `/${INTERNAL_CMS_PATH}/:path*` },
  ]
}

const nextConfig: NextConfig = {
  // Each Playwright harness builds into its own directory: .next/cache is the unstable_cache store, which otherwise leaks data across harness databases.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async redirects() {
    return LEGACY_REDIRECTS.map((redirect) => ({ ...redirect, permanent: true }))
  },
  async rewrites() {
    return { beforeFiles: cmsRewrites(), afterFiles: [], fallback: [] }
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
