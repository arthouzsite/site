import { describe, expect, it, vi } from 'vitest'
import { toAdminExhibition, type ExhibitionRow } from './exhibitions.mapper'

vi.mock('@/lib/server/clock', () => ({ today: () => new Date('2026-10-30T00:00:00.000Z') }))

function row(over: Partial<ExhibitionRow> = {}): ExhibitionRow {
  return {
    id: 'e1',
    slug: 'show',
    title: 'Show',
    datesLabel: null,
    statusOverride: null,
    startDate: new Date('2026-12-01T00:00:00.000Z'),
    endDate: new Date('2027-01-15T00:00:00.000Z'),
    heroImage: null,
    artists: [{ artist: { id: 'a1', name: 'Ana' } }, { artist: { id: 'a2', name: 'Bob' } }],
    ...over,
  } as unknown as ExhibitionRow
}

describe('toAdminExhibition', () => {
  it('derives status, label, date range and artist line', () => {
    expect(toAdminExhibition(row())).toMatchObject({
      status: 'UPCOMING',
      statusLabel: 'Upcoming',
      datesLabelResolved: 'December 1, 2026 – January 15, 2027',
      artistLine: 'Ana, Bob',
      heroImage: null,
    })
  })

  it('prefers the written dates label and an explicit status override', () => {
    expect(toAdminExhibition(row({ datesLabel: 'Winter', statusOverride: 'CURRENT' }))).toMatchObject({
      status: 'CURRENT',
      datesLabelResolved: 'Winter',
    })
  })
})
