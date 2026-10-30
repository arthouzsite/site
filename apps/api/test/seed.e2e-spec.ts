import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { runSeed, seedDatabase } from '../prisma/seed'
import { migrateTestDb, resetDb } from './helpers/db'

const SEED_OPTS = { adminEmail: 'admin@example.com', adminPassword: 'change-me-now-please' }

describe('seed', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    migrateTestDb()
    await resetDb()
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_TEST }) })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('seeds the prototype content idempotently', async () => {
    await seedDatabase(prisma, SEED_OPTS)
    await seedDatabase(prisma, SEED_OPTS)

    expect(await prisma.exhibition.count()).toBe(9)
    expect(await prisma.artist.count()).toBe(55)
    expect(await prisma.news.count()).toBe(10)
    expect(await prisma.fair.count()).toBe(4)
    expect(await prisma.location.count()).toBe(2)
    const services = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } })
    expect(services.map((x) => [x.slug, x.title, x.sortOrder, x.isPublished, x.ctaLabel, x.ctaHref, x.contactName, x.contactPhone, x.contactEmail])).toEqual([
      ['art-sales', 'Art sales', 0, true, 'Enquire →', '', '', '', ''],
      ['gallery-on-rent', 'Gallery on rent', 1, true, 'Enquire →', '', '', '', ''],
      ['art-for-rent', 'Art for rent', 2, true, 'Enquire →', '', '', '', ''],
      ['corporate-painting-execution', 'Corporate painting execution', 3, true, 'Enquire →', '', '', '', ''],
      ['turn-key-art-projects', 'Turn-key art projects', 4, true, 'Enquire →', '', '', '', ''],
    ])
    const serviceImages = await prisma.media.findMany({ where: { id: { in: services.map((x) => x.imageId ?? '') } }, select: { key: true } })
    expect(serviceImages.map((m) => m.key).sort()).toEqual(['seed/aquarium', 'seed/green', 'seed/lilies', 'seed/mines', 'seed/troika'])
    expect(services[0]?.summary).toBe('Acquire works by the artists we represent, or sell through the gallery.')
    expect(services[0]?.body).toBe(services[0]?.summary)
    expect(await prisma.artwork.count()).toBe(55 * 6)
    expect(await prisma.exhibitionWork.count()).toBe(27)
    expect(await prisma.user.count()).toBe(1)

    const tide = await prisma.exhibition.findUniqueOrThrow({
      where: { slug: 'tidewater' },
      include: { artists: { orderBy: { sortOrder: 'asc' }, include: { artist: true } } },
    })
    expect(tide.artists.map((a) => a.artist.name)).toEqual(['Parvathi Nayar', 'Ranjith Raman', 'P. Gopinath', 'Pradeep Unni'])
    expect(tide.isPublished).toBe(true)
    expect(tide.startDate.toISOString().slice(0, 10)).toBe('2026-10-03')

    const hero = await prisma.setting.findUniqueOrThrow({ where: { key: 'heroLayout' } })
    expect(hero.value).toBe('FULL_BLEED')
  })

  it('keeps prototype fidelity for Tamil titles, featured artists and focus', async () => {
    const tamil = await prisma.news.findFirstOrThrow({ where: { title: { startsWith: 'நான் யார்' } } })
    expect(tamil.publishedAt.toISOString().slice(0, 10)).toBe('2023-08-01')
    const reflections = await prisma.exhibition.findUniqueOrThrow({ where: { slug: 'reflections' } })
    expect(reflections.datesLabel).toBe('September 14, 2024 – September 30, 2024')
    const featured = await prisma.artist.findMany({ where: { isFeatured: true }, orderBy: { featuredOrder: 'asc' } })
    expect(featured.map((a) => a.name)).toEqual([
      'Vijay Pichumani', 'Seema Kohli', 'Parvathi Nayar', 'S.G. Vasudev', 'K.M. Adimoolam', 'Madhvi Parekh',
    ])
    const focus = await prisma.setting.findUniqueOrThrow({ where: { key: 'homeFocus' } })
    const vijay = await prisma.artist.findUniqueOrThrow({ where: { slug: 'vijay-pichumani' } })
    expect((focus.value as { artistId: string }).artistId).toBe(vijay.id)
  })

  it('without SEED_FORCE only upserts the admin when content exists and leaves edits alone', async () => {
    await prisma.exhibition.update({ where: { slug: 'tidewater' }, data: { title: 'Edited by the gallery' } })

    const outcome = await runSeed(prisma, { adminEmail: '  Second.Admin@Example.com ', adminPassword: 'change-me-now-please' }, false)

    expect(outcome).toBe('skipped')
    expect((await prisma.exhibition.findUniqueOrThrow({ where: { slug: 'tidewater' } })).title).toBe('Edited by the gallery')
    expect(await prisma.user.findUnique({ where: { email: 'second.admin@example.com' } })).toMatchObject({ role: 'ADMIN' })
  })

  it('without SEED_FORCE still adds the services to a database seeded before they existed', async () => {
    await prisma.service.deleteMany()

    expect(await runSeed(prisma, SEED_OPTS, false)).toBe('skipped')
    const added = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } })
    expect(added.map((s) => s.slug)).toEqual([
      'art-sales', 'gallery-on-rent', 'art-for-rent', 'corporate-painting-execution', 'turn-key-art-projects',
    ])
    expect(added.every((s) => s.imageId !== null)).toBe(true)
    expect((await prisma.exhibition.findUniqueOrThrow({ where: { slug: 'tidewater' } })).title).toBe('Edited by the gallery')
  })

  it('SEED_FORCE reloads the content over existing rows', async () => {
    const outcome = await runSeed(prisma, SEED_OPTS, true)

    expect(outcome).toBe('seeded')
    expect((await prisma.exhibition.findUniqueOrThrow({ where: { slug: 'tidewater' } })).title).not.toBe('Edited by the gallery')
  })

  it('seeds everything into an empty database even without SEED_FORCE', async () => {
    await resetDb()

    expect(await runSeed(prisma, SEED_OPTS, false)).toBe('seeded')
    expect(await prisma.exhibition.count()).toBe(9)
    expect(await prisma.user.count()).toBe(1)
  })
})
