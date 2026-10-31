import { afterEach, describe, expect, it, vi } from 'vitest'
import { today } from './clock'

const KOLKATA_NOW = new Date('2026-01-02T00:00:00.000Z')

vi.mock('@/lib/shared', () => ({ todayInKolkata: () => new Date('2026-01-02T00:00:00.000Z') }))

const mockEnv = vi.hoisted(() => ({ NODE_ENV: 'test', TODAY_OVERRIDE: undefined as string | undefined }))
vi.mock('./env', () => ({ env: mockEnv }))

describe('today', () => {
  afterEach(() => {
    mockEnv.NODE_ENV = 'test'
    mockEnv.TODAY_OVERRIDE = undefined
  })

  it('returns the override as UTC midnight outside production', () => {
    mockEnv.TODAY_OVERRIDE = '2026-10-30'
    expect(today().toISOString()).toBe('2026-10-30T00:00:00.000Z')
  })

  it('ignores the override in production', () => {
    mockEnv.NODE_ENV = 'production'
    mockEnv.TODAY_OVERRIDE = '2026-10-30'
    expect(today()).toEqual(KOLKATA_NOW)
  })

  it('falls back to todayInKolkata when no override is set', () => {
    expect(today()).toEqual(KOLKATA_NOW)
  })
})
