import { describe, expect, it } from 'vitest'
import { omit } from './omit'

describe('omit', () => {
  it('returns a copy without the listed keys and leaves the source alone', () => {
    const source = { a: 1, b: 2, c: 3 }
    expect(omit(source, ['a', 'c'])).toEqual({ b: 2 })
    expect(source).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('ignores keys the source does not have', () => {
    expect(omit({ a: 1 } as { a: number; b?: number }, ['b'])).toEqual({ a: 1 })
  })
})
