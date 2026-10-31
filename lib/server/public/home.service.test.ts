import { describe, expect, it, vi } from 'vitest'
import { SETTING_DEFAULTS } from '@/lib/shared'
import { prisma } from '@/lib/server/prisma'
import { settingsService } from '@/lib/server/settings/settings.service'
import { buildHome } from './home.service'

const fake = vi.hoisted(() => ({
  exhibition: { findMany: vi.fn() },
  artist: { findFirst: vi.fn(), findMany: vi.fn() },
  location: { findMany: vi.fn() },
  news: { findMany: vi.fn() },
  media: { findMany: vi.fn() },
}))
vi.mock('@/lib/server/prisma', () => ({ prisma: fake }))
vi.mock('@/lib/server/settings/settings.service', () => ({ settingsService: { getAll: vi.fn() } }))

const TODAY = new Date('2026-10-30T00:00:00.000Z')
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

function exhibition(slug: string, start: string, end: string, over: Record<string, unknown> = {}) {
  return {
    id: `id-${slug}`, slug, title: slug, subtitle: '', city: 'Chennai', country: 'India', type: 'SOLO',
    startDate: d(start), endDate: d(end), datesLabel: null, statusOverride: null, venue: '', blurb: '', body: '',
    heroImage: null, artists: [], ...over,
  }
}

type Fixture = { exhibitions?: unknown[]; settings?: Record<string, unknown>; artists?: unknown[] }

function build(fx: Fixture = {}) {
  fake.exhibition.findMany.mockResolvedValue(fx.exhibitions ?? [])
  fake.artist.findFirst.mockResolvedValue(null)
  fake.artist.findMany.mockImplementation(({ take }: { take: number }) => Promise.resolve((fx.artists ?? []).slice(0, take)))
  fake.location.findMany.mockResolvedValue([])
  fake.news.findMany.mockResolvedValue([])
  fake.media.findMany.mockResolvedValue([])
  vi.mocked(settingsService.getAll).mockResolvedValue({ ...SETTING_DEFAULTS, ...fx.settings } as never)
  return { service: { build: buildHome }, prisma }
}

describe('buildHome', () => {
  const current = exhibition('current', '2026-10-01', '2026-12-01')
  const older = exhibition('older-current', '2026-09-01', '2026-11-30')
  const past = [
    exhibition('past-a', '2025-01-01', '2025-02-01'),
    exhibition('past-b', '2025-03-01', '2025-04-01'),
    exhibition('past-c', '2025-05-01', '2025-06-01'),
    exhibition('past-d', '2025-07-01', '2025-08-01'),
  ]

  it('hero prefers override', async () => {
    const { service } = build({ exhibitions: [current, older, past[0]], settings: { homeHeroExhibitionId: 'id-past-a' } })
    expect((await service.build(TODAY)).hero?.slug).toBe('past-a')
  })

  it('hero ignores an override that is not published, then takes the most recent current', async () => {
    const { service } = build({ exhibitions: [current, older], settings: { homeHeroExhibitionId: 'id-missing' } })
    expect((await service.build(TODAY)).hero?.slug).toBe('current')
  })

  it('hero falls back to the soonest upcoming when nothing current', async () => {
    const later = exhibition('later', '2027-03-01', '2027-04-01')
    const sooner = exhibition('sooner', '2027-01-01', '2027-02-01')
    const { service } = build({ exhibitions: [later, sooner, past[0]] })
    expect((await service.build(TODAY)).hero?.slug).toBe('sooner')
  })

  it('hero falls back to the most recently ended past show when nothing current or upcoming', async () => {
    const longRunning = exhibition('long', '2024-01-01', '2025-12-01')
    const { service } = build({ exhibitions: [past[2], longRunning, past[0]] })
    expect((await service.build(TODAY)).hero?.slug).toBe('long')
  })

  it('upcoming is null when none, else the soonest by startDate', async () => {
    expect((await build({ exhibitions: [current] }).service.build(TODAY)).upcoming).toBeNull()
    const later = exhibition('later', '2027-03-01', '2027-04-01')
    const sooner = exhibition('sooner', '2027-01-01', '2027-02-01')
    expect((await build({ exhibitions: [later, sooner, current] }).service.build(TODAY)).upcoming?.slug).toBe('sooner')
  })

  it('recent has at most 3 past ordered by endDate desc', async () => {
    const { service } = build({ exhibitions: [...past, current] })
    expect((await service.build(TODAY)).recent.map((e) => e.slug)).toEqual(['past-d', 'past-c', 'past-b'])
  })

  it('world excludes India', async () => {
    const abroad = exhibition('abroad', '2024-01-01', '2024-02-01', { country: 'Singapore' })
    const abroadNewer = exhibition('abroad-new', '2027-01-01', '2027-02-01', { country: 'UK' })
    const { service } = build({ exhibitions: [current, abroad, abroadNewer] })
    expect((await service.build(TODAY)).world.map((e) => e.slug)).toEqual(['abroad-new', 'abroad'])
  })

  it('artistsLine respects homeArtistCount', async () => {
    const artists = ['a', 'b', 'c', 'd'].map((n) => ({ name: n, slug: n }))
    const { service, prisma } = build({ artists, settings: { homeArtistCount: 2 } })
    expect((await service.build(TODAY)).artistsLine).toEqual([{ name: 'a', slug: 'a' }, { name: 'b', slug: 'b' }])
    expect(prisma.artist.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2, orderBy: [{ sortName: 'asc' }, { id: 'asc' }] }))
  })

  it('focus resolves the published artist and the image setting', async () => {
    const settings = { homeFocus: { baseLabel: '', mediumLabel: '', text: '', artistId: 'a1', imageId: 'm1' } }
    const built = build({ settings })
    fake.artist.findFirst.mockResolvedValueOnce({ slug: 'asha', name: 'Asha' })
    fake.media.findMany.mockResolvedValue([{ id: 'm1', url: 'u', thumbUrl: 't', width: 1, height: 2, alt: 'x' }])
    const home = await built.service.build(TODAY)
    expect(home.focus.artist).toEqual({ slug: 'asha', name: 'Asha' })
    expect(home.focus.image).toEqual({ url: 'u', thumbUrl: 't', width: 1, height: 2, alt: 'x' })
  })
})
