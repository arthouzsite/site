import { describe, expect, it } from 'vitest'
import { assertExactOrder } from './exact-order'

describe('assertExactOrder', () => {
  it('accepts every existing id exactly once, in any order', () => {
    expect(() => assertExactOrder(['b', 'a', 'c'], ['a', 'b', 'c'], 'artist')).not.toThrow()
    expect(() => assertExactOrder([], [], 'artist')).not.toThrow()
  })

  it.each([
    ['a missing id', ['a'], ['a', 'b']],
    ['an extra id', ['a', 'b', 'c'], ['a', 'b']],
    ['a duplicate id', ['a', 'a'], ['a', 'b']],
    ['an unknown id', ['a', 'z'], ['a', 'b']],
  ])('rejects %s with 400 INVALID_ORDER', (_label, requested, existing) => {
    expect(() => assertExactOrder(requested, existing, 'artist')).toThrowError(
      expect.objectContaining({ status: 400, code: 'INVALID_ORDER', message: 'ids must list every artist exactly once' }),
    )
  })
})
