import { describe, expect, test } from 'vitest'
import { STATUS_BADGE, deriveExhibitionStatus, resolveExhibitionStatus, todayInKolkata } from '../index'

const d = (s: string) => new Date(s)
const startDate = d('2026-10-03')
const endDate = d('2026-11-22')

describe('status', () => {
  test('inclusive on end date', () => expect(deriveExhibitionStatus(startDate, endDate, endDate)).toBe('CURRENT'))
  test('inclusive on start date', () => expect(deriveExhibitionStatus(startDate, endDate, startDate)).toBe('CURRENT'))
  test('upcoming before start', () => expect(deriveExhibitionStatus(startDate, endDate, d('2026-09-01'))).toBe('UPCOMING'))
  test('past after end', () => expect(deriveExhibitionStatus(startDate, endDate, d('2026-12-01'))).toBe('PAST'))
  test('override wins', () =>
    expect(resolveExhibitionStatus({ startDate, endDate, statusOverride: 'PAST' }, d('2026-10-10'))).toBe('PAST'))
  test('derives when no override', () =>
    expect(resolveExhibitionStatus({ startDate, endDate, statusOverride: null }, d('2026-10-10'))).toBe('CURRENT'))
  test('defaults today to Kolkata today', () =>
    expect(['CURRENT', 'UPCOMING', 'PAST']).toContain(resolveExhibitionStatus({ startDate, endDate, statusOverride: null })))
  test('todayInKolkata rolls the date at 18:30Z', () =>
    expect(todayInKolkata(new Date('2026-10-30T18:30:00Z')).toISOString()).toBe('2026-10-31T00:00:00.000Z'))
  test('todayInKolkata before the roll', () =>
    expect(todayInKolkata(new Date('2026-10-30T18:29:00Z')).toISOString()).toBe('2026-10-30T00:00:00.000Z'))
  test('todayInKolkata defaults to now', () => expect(todayInKolkata().getUTCHours()).toBe(0))
  test('badge values', () => {
    expect(STATUS_BADGE.CURRENT).toEqual({ label: 'Now on view', bg: '#D98A2B', fg: '#161513', line: '#D98A2B' })
    expect(STATUS_BADGE.UPCOMING).toEqual({ label: 'Upcoming', bg: '#161513', fg: '#EDEAE4', line: '#161513' })
    expect(STATUS_BADGE.PAST).toEqual({ label: 'Past', bg: 'transparent', fg: '#5E5A54', line: 'rgba(22,21,19,0.3)' })
  })
})
