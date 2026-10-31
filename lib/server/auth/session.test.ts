import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import { env } from '@/lib/server/env'
import { SEVEN_DAYS_SECONDS, SESSION_COOKIE } from './constants'
import { readSessionCookie, sessionClearCookie, sessionSetCookie, signSession, verifySession } from './session'

const secret = new TextEncoder().encode(env.JWT_SECRET)

describe('signSession / verifySession', () => {
  it('round-trips the user id as the sub claim', async () => {
    const token = await signSession('user-1')
    await expect(verifySession(token)).resolves.toEqual({ sub: 'user-1' })
  })

  it('issues an HS256 token that expires in seven days (claim shape matches the old API)', async () => {
    const token = await signSession('user-1')
    const [header, payload] = token.split('.').slice(0, 2).map((part) => JSON.parse(Buffer.from(part, 'base64url').toString()))
    expect(header).toMatchObject({ alg: 'HS256' })
    expect(payload).toMatchObject({ sub: 'user-1' })
    expect(payload.exp - payload.iat).toBe(SEVEN_DAYS_SECONDS)
  })

  it('returns null for garbage, a wrong signature, an expired token and a token without sub', async () => {
    expect(await verifySession('garbage')).toBeNull()
    const foreign = await new SignJWT({}).setSubject('u').setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(new TextEncoder().encode('another-secret-another-secret-123456'))
    expect(await verifySession(foreign)).toBeNull()
    const expired = await new SignJWT({}).setSubject('u').setProtectedHeader({ alg: 'HS256' }).setIssuedAt(1).setExpirationTime(2).sign(secret)
    expect(await verifySession(expired)).toBeNull()
    const noSub = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(secret)
    expect(await verifySession(noSub)).toBeNull()
  })

  it('rejects a token signed with another algorithm', async () => {
    const hs512 = await new SignJWT({}).setSubject('u').setProtectedHeader({ alg: 'HS512' }).setExpirationTime('7d').sign(secret)
    expect(await verifySession(hs512)).toBeNull()
  })
})

describe('cookies', () => {
  it('reads the session cookie from the request', () => {
    const request = new Request('http://localhost/api/auth/me', { headers: { cookie: `a=1; ${SESSION_COOKIE}=tok; b=2` } })
    expect(readSessionCookie(request)).toBe('tok')
  })

  it('returns null when the cookie is absent or empty', () => {
    expect(readSessionCookie(new Request('http://localhost/'))).toBeNull()
    expect(readSessionCookie(new Request('http://localhost/', { headers: { cookie: `${SESSION_COOKIE}=` } }))).toBeNull()
  })

  it('sets an HttpOnly, SameSite=Lax, seven-day cookie that is not Secure outside production', () => {
    const header = sessionSetCookie('tok')
    expect(header).toMatch(/^ah_session=tok;/)
    expect(header).toMatch(/HttpOnly/)
    expect(header).toMatch(/SameSite=Lax/)
    expect(header).toMatch(/Path=\//)
    expect(header).toMatch(/Max-Age=604800/)
    expect(header).not.toMatch(/Secure/)
  })

  it('clears the cookie with an empty value and zero max-age', () => {
    const header = sessionClearCookie()
    expect(header).toMatch(/^ah_session=;/)
    expect(header).toMatch(/Max-Age=0/)
    expect(header).toMatch(/HttpOnly/)
  })
})
