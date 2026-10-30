import { describe, expect, it } from 'vitest'
import { currentYear } from '@/lib/site-clock'

const NOW = new Date('2031-05-01T00:00:00Z')

describe('currentYear', () => {
  it('uses TODAY_OVERRIDE outside production', () => {
    expect(currentYear(NOW, { NODE_ENV: 'development', TODAY_OVERRIDE: '2026-10-30' })).toBe(2026)
  })

  it('ignores TODAY_OVERRIDE in production', () => {
    expect(currentYear(NOW, { NODE_ENV: 'production', TODAY_OVERRIDE: '2026-10-30' })).toBe(2031)
  })

  it('honours TODAY_OVERRIDE under next start only with ALLOW_TODAY_OVERRIDE=1', () => {
    expect(currentYear(NOW, { NODE_ENV: 'production', TODAY_OVERRIDE: '2026-10-30', ALLOW_TODAY_OVERRIDE: '1' })).toBe(2026)
  })

  it('falls back to the clock when the override is missing or malformed', () => {
    expect(currentYear(NOW, { NODE_ENV: 'test' })).toBe(2031)
    expect(currentYear(NOW, { NODE_ENV: 'test', TODAY_OVERRIDE: '30/10/2026' })).toBe(2031)
  })
})
