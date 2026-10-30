import { describe, expect, test } from 'vitest'
import { formatDateRange, formatMonthYear } from '../src/index'

describe('dates', () => {
  test('same-year range prints month day – month day, year', () =>
    expect(formatDateRange(new Date('2026-10-03'), new Date('2026-11-22'))).toBe('October 3 – November 22, 2026'))
  test('cross-year range repeats the year', () =>
    expect(formatDateRange(new Date('2024-12-14'), new Date('2025-01-30'))).toBe('December 14, 2024 – January 30, 2025'))
  test('month-year', () => expect(formatMonthYear(new Date('2024-02-02'))).toBe('February 2024'))
})
