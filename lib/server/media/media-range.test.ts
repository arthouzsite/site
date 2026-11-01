import { describe, expect, it } from 'vitest'
import { parseRangeHeader, resolveRange } from './media-range'

describe('parseRangeHeader', () => {
  it('reads closed, open-ended and suffix ranges', () => {
    expect(parseRangeHeader('bytes=0-99')).toEqual({ start: 0, end: 99 })
    expect(parseRangeHeader('bytes=100-')).toEqual({ start: 100 })
    expect(parseRangeHeader('bytes=-500')).toEqual({ suffix: 500 })
  })

  it('ignores a missing or malformed header, other units and multiple ranges', () => {
    for (const header of [null, '', 'bytes=', 'bytes=-', 'bytes=a-b', 'items=0-1', 'bytes=0-1,5-6', 'bytes=9-3', 'bytes=-0', 'bytes=0-1-2', 'bytes=1.5-2']) {
      expect(parseRangeHeader(header)).toBeUndefined()
    }
  })
})

describe('resolveRange', () => {
  it('clamps an end past the object', () => {
    expect(resolveRange({ start: 2, end: 99 }, 10)).toEqual({ start: 2, end: 9, total: 10 })
    expect(resolveRange({ start: 4 }, 10)).toEqual({ start: 4, end: 9, total: 10 })
  })

  it('counts a suffix from the end and clamps it to the object', () => {
    expect(resolveRange({ suffix: 3 }, 10)).toEqual({ start: 7, end: 9, total: 10 })
    expect(resolveRange({ suffix: 50 }, 10)).toEqual({ start: 0, end: 9, total: 10 })
  })

  it('is null when the range starts past the object or the object is empty', () => {
    expect(resolveRange({ start: 10 }, 10)).toBeNull()
    expect(resolveRange({ start: 0 }, 0)).toBeNull()
    expect(resolveRange({ suffix: 3 }, 0)).toBeNull()
  })
})
