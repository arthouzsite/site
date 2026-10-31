import { describe, expect, it } from 'vitest'
import { assertSameOrigin } from './origin'

const req = (origin?: string) =>
  new Request('http://localhost:3300/api/x', { method: 'POST', headers: origin === undefined ? {} : { origin } })

const PUBLIC_URL = 'https://arthouz.example'

describe('assertSameOrigin', () => {
  it('passes without an Origin header and with the request origin', () => {
    expect(() => assertSameOrigin(req(), undefined)).not.toThrow()
    expect(() => assertSameOrigin(req('http://localhost:3300'), undefined)).not.toThrow()
  })

  it('throws 403 BAD_ORIGIN for any other origin, including another port and scheme', () => {
    for (const origin of ['http://evil.example', 'http://localhost:3301', 'https://localhost:3300', 'null']) {
      expect(() => assertSameOrigin(req(origin), undefined)).toThrowError(expect.objectContaining({ status: 403, code: 'BAD_ORIGIN' }))
    }
  })

  it('without NEXT_PUBLIC_SITE_URL the forwarded https origin is rejected, as before', () => {
    expect(() => assertSameOrigin(req(PUBLIC_URL), undefined)).toThrowError(expect.objectContaining({ code: 'BAD_ORIGIN' }))
  })

  it('behind a TLS proxy, allows the https origin that equals NEXT_PUBLIC_SITE_URL (path and slash ignored)', () => {
    expect(() => assertSameOrigin(req(PUBLIC_URL), PUBLIC_URL)).not.toThrow()
    expect(() => assertSameOrigin(req(PUBLIC_URL), `${PUBLIC_URL}/`)).not.toThrow()
  })

  it('still allows the request origin when NEXT_PUBLIC_SITE_URL is set', () => {
    expect(() => assertSameOrigin(req('http://localhost:3300'), PUBLIC_URL)).not.toThrow()
  })

  it('still rejects a third origin when NEXT_PUBLIC_SITE_URL is set', () => {
    for (const origin of ['https://evil.example', 'http://arthouz.example', 'https://arthouz.example:8443']) {
      expect(() => assertSameOrigin(req(origin), PUBLIC_URL)).toThrowError(expect.objectContaining({ status: 403, code: 'BAD_ORIGIN' }))
    }
  })

  it('defaults to env.NEXT_PUBLIC_SITE_URL (unset in tests)', () => {
    expect(() => assertSameOrigin(req(PUBLIC_URL))).toThrowError(expect.objectContaining({ code: 'BAD_ORIGIN' }))
  })
})
