import { env } from '@/lib/server/env'

const UNKNOWN_IP = 'unknown'

/**
 * Client address for rate limiting. Route handlers cannot see the socket, so with TRUST_PROXY=0 the
 * header is ignored; with n trusted proxies the address is the nth entry from the right of x-forwarded-for.
 */
export function clientIp(request: Request, trustedHops: number = env.TRUST_PROXY): string {
  if (trustedHops < 1) return UNKNOWN_IP
  const hops = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean)
  return hops[Math.max(hops.length - trustedHops, 0)] ?? UNKNOWN_IP
}
