import { describe, expect, it } from 'vitest'
import { parsePagination } from './pagination'

describe('parsePagination', () => {
  it('defaults to page 1 with limit 50', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 50, skip: 0 })
  })

  it('computes skip from page and limit', () => {
    expect(parsePagination({ page: '3', limit: '20' })).toEqual({ page: 3, limit: 20, skip: 40 })
  })

  it('caps limit at 200', () => {
    expect(parsePagination({ limit: '5000' }).limit).toBe(200)
  })

  it('falls back to defaults for invalid values', () => {
    expect(parsePagination({ page: '-2', limit: 'abc' })).toEqual({ page: 1, limit: 50, skip: 0 })
  })
})
