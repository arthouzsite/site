import { SETTING_DEFAULTS } from '@arthouz/shared'
import { HomeService } from './home.service'

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
  const prisma = {
    exhibition: { findMany: jest.fn().mockResolvedValue(fx.exhibitions ?? []) },
    artist: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockImplementation(({ take }: { take: number }) => Promise.resolve((fx.artists ?? []).slice(0, take))),
    },
    location: { findMany: jest.fn().mockResolvedValue([]) },
    news: { findMany: jest.fn().mockResolvedValue([]) },
    media: { findMany: jest.fn().mockResolvedValue([]) },
  }
  const settings = { getAll: jest.fn().mockResolvedValue({ ...SETTING_DEFAULTS, ...fx.settings }) }
  return { service: new HomeService(prisma as never, settings as never), prisma }
}

describe('HomeService.build', () => {
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

  it('hero falls back to most recent when nothing current', async () => {
    const { service } = build({ exhibitions: [past[2], past[0], past[1]] })
    expect((await service.build(TODAY)).hero?.slug).toBe('past-c')
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
})
