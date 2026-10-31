export type CookieOptions = {
  httpOnly: boolean
  sameSite: 'Lax'
  secure: boolean
  path: string
  maxAge: number
}

const EPOCH = 'Thu, 01 Jan 1970 00:00:00 GMT'

/** Builds a Set-Cookie header value. A zero max-age also sends an epoch Expires for old clients. */
export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Max-Age=${options.maxAge}`]
  if (options.maxAge <= 0) parts.push(`Expires=${EPOCH}`)
  parts.push(`Path=${options.path}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  parts.push(`SameSite=${options.sameSite}`)
  return parts.join('; ')
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Parses a Cookie request header; the first occurrence of a name wins. */
export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=')
    if (separator === -1) continue
    const name = pair.slice(0, separator).trim()
    if (name && !(name in cookies)) cookies[name] = decode(pair.slice(separator + 1).trim())
  }
  return cookies
}
