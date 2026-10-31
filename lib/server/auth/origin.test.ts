import { describe, expect, it } from 'vitest'
import { assertSameOrigin } from './origin'

const req = (origin?: string) =>
  new Request('http://localhost:3300/api/x', { method: 'POST', headers: origin === undefined ? {} : { origin } })

describe('assertSameOrigin', () => {
  it('passes without an Origin header and with the request origin', () => {
    expect(() => assertSameOrigin(req())).not.toThrow()
    expect(() => assertSameOrigin(req('http://localhost:3300'))).not.toThrow()
  })

  it('throws 403 BAD_ORIGIN for any other origin, including another port and scheme', () => {
    for (const origin of ['http://evil.example', 'http://localhost:3301', 'https://localhost:3300', 'null']) {
      expect(() => assertSameOrigin(req(origin))).toThrowError(expect.objectContaining({ status: 403, code: 'BAD_ORIGIN' }))
    }
  })
})
