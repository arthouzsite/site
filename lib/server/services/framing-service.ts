import { settingSchemas } from '@/lib/shared'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'

export const FRAMING_SLUG = 'framing-services'
const ABOUT_SERVICES_KEY = 'about.services'

export type FramingResult = { status: 'created' | 'skipped' | 'no-content'; slug: string }

/**
 * Moves the Framing Services copy stored in the About settings into a published Service (slug `framing-services`).
 * Idempotent: does nothing when that slug exists. The About setting row is left untouched.
 */
export async function createFramingService(prisma: PrismaClient): Promise<FramingResult> {
  const slug = FRAMING_SLUG
  if (await prisma.service.findUnique({ where: { slug }, select: { id: true } })) return { status: 'skipped', slug }
  const stored = await prisma.setting.findUnique({ where: { key: ABOUT_SERVICES_KEY } })
  if (!stored) return { status: 'no-content', slug }
  const { title, body, ctaLabel, imageId } = settingSchemas[ABOUT_SERVICES_KEY].parse(stored.value) as {
    title: string; body: string; ctaLabel: string; imageId: string | null
  }
  if (!title.trim()) return { status: 'no-content', slug }
  const last = await prisma.service.aggregate({ _max: { sortOrder: true } })
  await prisma.service.create({
    data: { slug, title, body, imageId, ...(ctaLabel ? { ctaLabel } : {}), isPublished: true, sortOrder: (last._max.sortOrder ?? -1) + 1 },
  })
  return { status: 'created', slug }
}
