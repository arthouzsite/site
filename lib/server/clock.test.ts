import { afterEach, describe, expect, it, vi } from 'vitest'
import { today } from './clock'

const KOLKATA_NOW = new Date('2026-01-02T00:00:00.000Z')

vi.mock('@/lib/shared', () => ({ todayInKolkata: () => new Date('2026-01-02T00:00:00.000Z') }))

const mockEnv = vi.hoisted(() => ({
  NODE_ENV: 'test',
  TODAY_OVERRIDE: undefined as string | undefined,
  ALLOW_TEST_OVERRIDES: undefined as string | undefined,
}))
vi.mock('./env', () => ({ env: mockEnv }))

describe('today', () => {
  afterEach(() => {
    mockEnv.NODE_ENV = 'test'
    mockEnv.TODAY_OVERRIDE = undefined
    mockEnv.ALLOW_TEST_OVERRIDES = undefined
  })

  it('returns the override as UTC midnight outside production', () => {
    mockEnv.NODE_ENV = 'development'
    mockEnv.TODAY_OVERRIDE = '2026-10-30'
    expect(today().toISOString()).toBe('2026-10-30T00:00:00.000Z')
  })

  it('returns the override under next start when ALLOW_TEST_OVERRIDES=1', () => {
    mockEnv.NODE_ENV = 'production'
    mockEnv.ALLOW_TEST_OVERRIDES = '1'
    mockEnv.TODAY_OVERRIDE = '2026-10-30'
    expect(today().toISOString()).toBe('2026-10-30T00:00:00.000Z')
  })

  it('ignores the override in production without ALLOW_TEST_OVERRIDES', () => {
    mockEnv.NODE_ENV = 'production'
    mockEnv.TODAY_OVERRIDE = '2026-10-30'
    expect(today()).toEqual(KOLKATA_NOW)
  })

  it('falls back to todayInKolkata when no override is set', () => {
    expect(today()).toEqual(KOLKATA_NOW)
  })
})
