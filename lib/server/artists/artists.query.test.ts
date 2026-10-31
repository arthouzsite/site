import { describe, expect, it } from 'vitest'
import { artistListQuerySchema, artistListWhere } from './artists.query'

describe('artistListQuerySchema', () => {
  it('accepts a letter A-Z or #', () => {
    expect(artistListQuerySchema.parse({ letter: 'K' }).letter).toBe('K')
    expect(artistListQuerySchema.parse({ letter: '#' }).letter).toBe('#')
  })

  it.each(['AB', 'k', '1'])('rejects letter %s', (letter) => {
    expect(artistListQuerySchema.safeParse({ letter }).success).toBe(false)
  })

  it('coerces page and limit and trims q', () => {
    expect(artistListQuerySchema.parse({ page: '2', limit: '10', q: '  ab ' })).toEqual({ page: 2, limit: 10, q: 'ab' })
  })

  it('rejects non-boolean featured and page below 1', () => {
    expect(artistListQuerySchema.safeParse({ featured: 'yes' }).success).toBe(false)
    expect(artistListQuerySchema.safeParse({ page: '0' }).success).toBe(false)
  })
})

describe('artistListWhere', () => {
  it('is an empty AND for no filters', () => {
    expect(artistListWhere({})).toEqual({ AND: [] })
  })

  it('builds a prefix filter for a letter', () => {
    expect(artistListWhere({ letter: 'K' })).toEqual({ AND: [{ sortName: { startsWith: 'K', mode: 'insensitive' } }] })
  })

  it('builds the negated 26-prefix filter for #', () => {
    const [clause] = artistListWhere({ letter: '#' }).AND as Array<{ NOT: { OR: unknown[] } }>
    expect(clause?.NOT.OR).toHaveLength(26)
  })

  it('combines featured, published and q filters', () => {
    expect(artistListWhere({ featured: 'true', published: 'false', q: 'ab' }).AND).toEqual([
      { isFeatured: true },
      { isPublished: false },
      { OR: [{ name: { contains: 'ab', mode: 'insensitive' } }, { sortName: { contains: 'ab', mode: 'insensitive' } }] },
    ])
  })
})
