import { describe, expect, it, vi } from 'vitest'
import { exhibitionListQuerySchema, listQueryRecord, listWhere, statusWhere } from './exhibition-status'

const NOW = new Date('2026-10-30T00:00:00.000Z')

vi.mock('@/lib/server/clock', () => ({ today: () => new Date('2026-10-30T00:00:00.000Z') }))

describe('statusWhere', () => {
  it('lets an explicit override win and otherwise compares the dates with today', () => {
    expect(statusWhere('PAST')).toEqual({ OR: [{ statusOverride: 'PAST' }, { statusOverride: null, endDate: { lt: NOW } }] })
    expect(statusWhere('UPCOMING')).toEqual({ OR: [{ statusOverride: 'UPCOMING' }, { statusOverride: null, startDate: { gt: NOW } }] })
    expect(statusWhere('CURRENT')).toEqual({
      OR: [{ statusOverride: 'CURRENT' }, { statusOverride: null, startDate: { lte: NOW }, endDate: { gte: NOW } }],
    })
  })
})

describe('listWhere', () => {
  it('has no conditions for an empty query', () => {
    expect(listWhere({})).toEqual({ AND: [] })
  })

  it('adds one condition per filter', () => {
    const where = listWhere({ city: 'Delhi', published: 'false', artistId: 'a1', q: 'tide' })
    expect(where.AND).toEqual([
      { city: { equals: 'Delhi', mode: 'insensitive' } },
      { isPublished: false },
      { artists: { some: { artistId: 'a1' } } },
      { OR: [{ title: { contains: 'tide', mode: 'insensitive' } }, { subtitle: { contains: 'tide', mode: 'insensitive' } }] },
    ])
  })
})

describe('exhibitionListQuerySchema', () => {
  it('upper-cases the status and coerces paging numbers', () => {
    expect(exhibitionListQuerySchema.parse({ status: 'current', page: '2', limit: '5' })).toEqual({ status: 'CURRENT', page: 2, limit: 5 })
  })

  it('rejects an unknown status and a repeated key', () => {
    expect(exhibitionListQuerySchema.safeParse({ status: 'bogus' }).success).toBe(false)
    expect(exhibitionListQuerySchema.safeParse(listQueryRecord(new URL('http://x/?city=a&city=b'))).success).toBe(false)
  })
})

describe('listQueryRecord', () => {
  it('keeps single values as strings and repeated keys as arrays', () => {
    expect(listQueryRecord(new URL('http://x/?a=1&b=2&b=3'))).toEqual({ a: '1', b: ['2', '3'] })
  })
})
