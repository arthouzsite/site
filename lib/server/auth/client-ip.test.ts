import { describe, expect, it } from 'vitest'
import { clientIp } from './client-ip'

const req = (xff?: string) => new Request('http://localhost/api/x', { headers: xff === undefined ? {} : { 'x-forwarded-for': xff } })

describe('clientIp', () => {
  it('takes the nth-from-right x-forwarded-for hop for TRUST_PROXY=n and ignores the header at 0', () => {
    const header = '1.1.1.1, 2.2.2.2, 3.3.3.3'
    expect(clientIp(req(header), 0)).toBe('unknown')
    expect(clientIp(req(header), 1)).toBe('3.3.3.3')
    expect(clientIp(req(header), 2)).toBe('2.2.2.2')
    expect(clientIp(req(header), 3)).toBe('1.1.1.1')
  })

  it('falls back to the leftmost hop when the chain is shorter than the trusted hop count', () => {
    expect(clientIp(req('9.9.9.9'), 3)).toBe('9.9.9.9')
  })

  it("returns 'unknown' when the header is missing or blank", () => {
    expect(clientIp(req(), 1)).toBe('unknown')
    expect(clientIp(req(' , '), 1)).toBe('unknown')
  })

  it('defaults to env.TRUST_PROXY (0 in tests), so a spoofed header is ignored', () => {
    expect(clientIp(req('6.6.6.6'))).toBe('unknown')
  })
})
