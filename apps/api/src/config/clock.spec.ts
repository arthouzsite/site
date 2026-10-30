const KOLKATA_NOW = new Date('2026-01-02T00:00:00.000Z')

jest.mock('@arthouz/shared', () => ({ todayInKolkata: () => new Date('2026-01-02T00:00:00.000Z') }))

const mockEnv: { NODE_ENV: string; TODAY_OVERRIDE?: string } = { NODE_ENV: 'test' }
jest.mock('./env', () => ({ env: mockEnv }))

import { today } from './clock'

describe('today', () => {
  afterEach(() => {
    mockEnv.NODE_ENV = 'test'
    delete mockEnv.TODAY_OVERRIDE
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
