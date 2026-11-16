import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migrateTestDb, resetDb } from '@/tests/api/helpers/db'
import { prisma } from '@/lib/server/prisma'
import { FRAMING_SLUG, createFramingService } from './framing-service'

const ABOUT_SERVICES = { title: 'Framing Services', body: 'Wooden frames.', ctaLabel: 'Enquire →' }

async function seedAbout(imageId: string | null, value: object = ABOUT_SERVICES) {
  await prisma.setting.create({ data: { key: 'about.services', value: { ...value, imageId } } })
}

describe('createFramingService', () => {
  beforeAll(() => migrateTestDb())
  beforeEach(resetDb)
  afterAll(() => prisma.$disconnect())

  it('creates a published service from the stored About content and leaves the setting alone', async () => {
    const image = await prisma.media.create({
      data: { key: 'k', url: 'https://x/k.jpg', thumbUrl: 'https://x/kt.jpg', width: 3, height: 2, mime: 'image/jpeg', bytes: 1, alt: 'a' },
    })
    await seedAbout(image.id)

    const result = await createFramingService(prisma)

    expect(result).toEqual({ status: 'created', slug: FRAMING_SLUG })
    expect(await prisma.service.findUnique({ where: { slug: 'framing-services' } })).toMatchObject({
      title: 'Framing Services', body: 'Wooden frames.', imageId: image.id, ctaLabel: 'Enquire →', ctaHref: '', isPublished: true,
    })
    expect(await prisma.setting.findUnique({ where: { key: 'about.services' } })).toMatchObject({ value: { ...ABOUT_SERVICES, imageId: image.id } })
  })

  it('is idempotent: a second run skips and changes nothing', async () => {
    await seedAbout(null)
    await createFramingService(prisma)
    await prisma.service.update({ where: { slug: FRAMING_SLUG }, data: { title: 'Edited in CMS' } })

    expect(await createFramingService(prisma)).toEqual({ status: 'skipped', slug: FRAMING_SLUG })
    expect(await prisma.service.count()).toBe(1)
    expect((await prisma.service.findUniqueOrThrow({ where: { slug: FRAMING_SLUG } })).title).toBe('Edited in CMS')
  })

  it('reports missing content instead of creating an empty service', async () => {
    expect(await createFramingService(prisma)).toEqual({ status: 'no-content', slug: FRAMING_SLUG })
    await seedAbout(null, { title: '', body: '', ctaLabel: '' })
    expect(await createFramingService(prisma)).toEqual({ status: 'no-content', slug: FRAMING_SLUG })
    expect(await prisma.service.count()).toBe(0)
  })
})
