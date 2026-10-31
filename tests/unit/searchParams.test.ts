import { describe, expect, it } from 'vitest'
import { buildExhibitionQuery, parseExhibitionParams } from '@/lib/searchParams'

describe('parseExhibitionParams', () => {
  it('parses invalid status to undefined', () => {
    expect(parseExhibitionParams({ status: 'bogus' }).status).toBeUndefined()
    expect(parseExhibitionParams({ status: ['past', 'current'] }).status).toBeUndefined()
  })

  it('keeps a valid status', () => {
    expect(parseExhibitionParams({ status: 'past' }).status).toBe('past')
  })

  it('trims city and drops blanks', () => {
    expect(parseExhibitionParams({ city: '  Chennai ' }).city).toBe('Chennai')
    expect(parseExhibitionParams({ city: '   ' }).city).toBeUndefined()
  })
})

describe('buildExhibitionQuery', () => {
  it('serialises only set filters', () => {
    expect(buildExhibitionQuery({ status: 'past', city: 'Chennai' })).toBe('?status=past&city=Chennai')
    expect(buildExhibitionQuery({})).toBe('')
  })
})
