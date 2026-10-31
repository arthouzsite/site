import { jwtVerify, SignJWT } from 'jose'
import { env } from '@/lib/server/env'
import { parseCookies, serializeCookie, type CookieOptions } from '@/lib/server/http/cookies'
import { SEVEN_DAYS_SECONDS, SESSION_COOKIE } from './constants'

const SESSION_LIFETIME = '7d'
const ALGORITHM = 'HS256'

const secretKey = (): Uint8Array => new TextEncoder().encode(env.JWT_SECRET)

export { SESSION_COOKIE }

/** Claim shape is `{ sub }` so cookies issued by the old API keep working. */
export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setSubject(userId)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(SESSION_LIFETIME)
    .sign(secretKey())
}

/** Returns the claims of a valid, unexpired token and null for anything else. */
export async function verifySession(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALGORITHM] })
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? { sub: payload.sub } : null
  } catch {
    return null
  }
}

export function readSessionCookie(request: Request): string | null {
  const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE]
  return token ? token : null
}

const cookieOptions = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  sameSite: 'Lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
  maxAge,
})

export function sessionSetCookie(token: string): string {
  return serializeCookie(SESSION_COOKIE, token, cookieOptions(SEVEN_DAYS_SECONDS))
}

export function sessionClearCookie(): string {
  return serializeCookie(SESSION_COOKIE, '', cookieOptions(0))
}
