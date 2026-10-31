import { describe, expect, it } from 'vitest'
import { allowsTestOverrides } from '@/lib/test-overrides'

describe('allowsTestOverrides', () => {
  it('allows overrides outside production', () => {
    for (const NODE_ENV of ['development', 'test', undefined]) expect(allowsTestOverrides({ NODE_ENV })).toBe(true)
  })

  it('allows overrides under next start only when ALLOW_TEST_OVERRIDES=1', () => {
    expect(allowsTestOverrides({ NODE_ENV: 'production', ALLOW_TEST_OVERRIDES: '1' })).toBe(true)
    expect(allowsTestOverrides({ NODE_ENV: 'production' })).toBe(false)
    expect(allowsTestOverrides({ NODE_ENV: 'production', ALLOW_TEST_OVERRIDES: '0' })).toBe(false)
    expect(allowsTestOverrides({ NODE_ENV: 'production', ALLOW_TEST_OVERRIDES: 'true' })).toBe(false)
  })
})
