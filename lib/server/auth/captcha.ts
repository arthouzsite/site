import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/server/env'
import { allowsTestOverrides } from '@/lib/test-overrides'
import { CAPTCHA_ALPHABET, renderCaptchaSvg } from './captcha-image'

const CODE_LENGTH = 5
const TTL_SECONDS = 5 * 60
const NONCE_BYTES = 12
const MS_PER_SECOND = 1000
const TOKEN_PARTS = 3

export type CaptchaChallenge = { token: string; image: string }

/** The code as people type it: spaces dropped, case ignored. */
function normalise(answer: string): string {
  return answer.replace(/\s+/g, '').toUpperCase()
}

/** Keyed, so the token reveals nothing about the code and cannot be forged without the server secret. */
function sign(nonce: string, expiresAt: number, code: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(`captcha:${nonce}:${expiresAt}:${code}`).digest('base64url')
}

function randomCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => CAPTCHA_ALPHABET[randomInt(CAPTCHA_ALPHABET.length)]).join('')
}

/** Browser test harnesses cannot read an image, so they pin the code; never honoured in a deployment. */
function pinnedCode(): string | undefined {
  return allowsTestOverrides(env) ? env.CAPTCHA_CODE_OVERRIDE : undefined
}

/** A fresh challenge plus its code. The code is returned for tests only: routes send the token and image. */
export function createCaptcha(now: Date = new Date()): CaptchaChallenge & { code: string } {
  const code = pinnedCode() ?? randomCode()
  const nonce = randomBytes(NONCE_BYTES).toString('base64url')
  const expiresAt = Math.floor(now.getTime() / MS_PER_SECOND) + TTL_SECONDS
  return { token: `${nonce}.${expiresAt}.${sign(nonce, expiresAt, code)}`, image: renderCaptchaSvg(code), code }
}

/** True when `answer` is the code drawn for `token` and the challenge has not expired. */
export function verifyCaptcha(token: string, answer: string, now: Date = new Date()): boolean {
  const parts = token.split('.')
  if (parts.length !== TOKEN_PARTS) return false
  const [nonce, expires, signature] = parts as [string, string, string]
  const expiresAt = Number(expires)
  if (!Number.isInteger(expiresAt) || expiresAt * MS_PER_SECOND <= now.getTime()) return false
  const expected = Buffer.from(sign(nonce, expiresAt, normalise(answer)))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
