import { describe, expect, it } from 'vitest'
import { createCaptcha, verifyCaptcha } from './captcha'
import { CAPTCHA_ALPHABET, renderCaptchaSvg } from './captcha-image'

const MINUTE_MS = 60_000

describe('captcha', () => {
  it('draws a five-character code from the unambiguous alphabet', () => {
    const { code } = createCaptcha()
    expect(code).toHaveLength(5)
    expect([...code].every((char) => CAPTCHA_ALPHABET.includes(char))).toBe(true)
    expect(CAPTCHA_ALPHABET).not.toMatch(/[01OISZB58]/)
  })

  it('accepts the right code whatever its case or spacing', () => {
    const { token, code } = createCaptcha()
    expect(verifyCaptcha(token, code)).toBe(true)
    expect(verifyCaptcha(token, ` ${code.toLowerCase().split('').join(' ')} `)).toBe(true)
  })

  it('rejects a wrong code, a code for another challenge and a malformed token', () => {
    const first = createCaptcha()
    const second = createCaptcha()
    const wrong = first.code.startsWith('A') ? `C${first.code.slice(1)}` : `A${first.code.slice(1)}`
    expect(verifyCaptcha(first.token, wrong)).toBe(false)
    expect(verifyCaptcha(second.token, first.code === second.code ? wrong : first.code)).toBe(false)
    expect(verifyCaptcha('not-a-token', first.code)).toBe(false)
    expect(verifyCaptcha('', first.code)).toBe(false)
  })

  it('rejects a token whose expiry was moved forward', () => {
    const { token, code } = createCaptcha()
    const [nonce, expires, signature] = token.split('.')
    expect(verifyCaptcha(`${nonce}.${Number(expires) + 600}.${signature}`, code)).toBe(false)
  })

  it('expires five minutes after it was drawn', () => {
    const drawn = new Date('2026-11-20T10:00:00Z')
    const { token, code } = createCaptcha(drawn)
    expect(verifyCaptcha(token, code, new Date(drawn.getTime() + 4 * MINUTE_MS))).toBe(true)
    expect(verifyCaptcha(token, code, new Date(drawn.getTime() + 5 * MINUTE_MS))).toBe(false)
  })

  it('keeps the code out of the picture markup and the token', () => {
    const { token, image, code } = createCaptcha()
    expect(image.startsWith('<svg')).toBe(true)
    expect(image).not.toContain('<text')
    expect(image).not.toContain(code)
    expect(token).not.toContain(code)
  })

  it('draws a different picture each time for the same code', () => {
    expect(renderCaptchaSvg('ACE23')).not.toBe(renderCaptchaSvg('ACE23'))
    expect(() => renderCaptchaSvg('A0')).toThrow('No captcha glyph')
  })
})
