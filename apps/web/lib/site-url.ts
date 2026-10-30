const DEFAULT_SITE_URL = 'http://localhost:3100'

/** Public origin of the site (no trailing slash), from NEXT_PUBLIC_SITE_URL. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/$/, '')
}
