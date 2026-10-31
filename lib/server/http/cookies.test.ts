import { describe, expect, it } from 'vitest'
import { parseCookies, serializeCookie } from './cookies'

describe('serializeCookie', () => {
  it('writes every attribute', () => {
    expect(serializeCookie('a', 'b', { httpOnly: true, sameSite: 'Lax', secure: true, path: '/', maxAge: 60 })).toBe(
      'a=b; Max-Age=60; Path=/; HttpOnly; Secure; SameSite=Lax',
    )
  })

  it('omits HttpOnly and Secure when false and marks a zero max-age as expired', () => {
    const header = serializeCookie('a', '', { httpOnly: false, sameSite: 'Lax', secure: false, path: '/', maxAge: 0 })
    expect(header).toBe('a=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax')
  })

  it('percent-encodes the value', () => {
    expect(serializeCookie('a', 'x y;z', { httpOnly: true, sameSite: 'Lax', secure: false, path: '/', maxAge: 1 })).toContain('a=x%20y%3Bz;')
  })
})

describe('parseCookies', () => {
  it('returns an empty record for a missing header', () => {
    expect(parseCookies(null)).toEqual({})
    expect(parseCookies('')).toEqual({})
  })

  it('parses pairs, trims whitespace and decodes values', () => {
    expect(parseCookies('a=1; b=x%20y;c=3')).toEqual({ a: '1', b: 'x y', c: '3' })
  })

  it('keeps the first occurrence, ignores nameless pairs and keeps malformed escapes verbatim', () => {
    expect(parseCookies('a=1; a=2; =x; bare; d=%E0%A4%A')).toEqual({ a: '1', d: '%E0%A4%A' })
  })

  it('keeps equals signs inside the value', () => {
    expect(parseCookies('t=abc==')).toEqual({ t: 'abc==' })
  })
})
