/**
 * Where the CMS is served. It is deliberately not `/admin`: a long unguessable segment keeps the sign-in page away
 * from scanners that probe well-known paths. Set NEXT_PUBLIC_CMS_PATH to use a different segment per deployment.
 */
export const DEFAULT_CMS_PATH = '4vuvp75izfgdqscn1ekihbgfa22w5tk69vsfzya9'

/** The route folder the CMS lives in; requests for it by this name are answered as not found. */
export const INTERNAL_CMS_PATH = 'admin'

const CMS_PATH_PATTERN = /^[A-Za-z0-9-]{1,80}$/

/** The public first path segment of the CMS, without slashes. */
export function cmsPath(configured: string | undefined = process.env.NEXT_PUBLIC_CMS_PATH): string {
  const value = configured?.trim()
  if (!value) return DEFAULT_CMS_PATH
  if (!CMS_PATH_PATTERN.test(value)) throw new Error('NEXT_PUBLIC_CMS_PATH may only contain letters, digits and hyphens')
  return value
}
