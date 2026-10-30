import { slugify } from '@arthouz/shared'
import type { PrismaService } from './prisma.service'

export type SlugModel = 'exhibition' | 'artist' | 'fair' | 'news' | 'location'

const FALLBACK_SLUG = 'untitled'
const FIRST_SUFFIX = 2

type SlugDelegate = {
  findFirst(args: { where: { slug: string; id?: { not: string } }; select: { id: true } }): Promise<{ id: string } | null>
}

export async function uniqueSlug(
  prisma: PrismaService,
  model: SlugModel,
  base: string,
  excludeId?: string,
): Promise<string> {
  const delegate = prisma[model] as unknown as SlugDelegate
  const root = slugify(base) || FALLBACK_SLUG
  for (let suffix = FIRST_SUFFIX - 1; ; suffix += 1) {
    const candidate = suffix < FIRST_SUFFIX ? root : `${root}-${suffix}`
    const clash = await delegate.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
    if (!clash) return candidate
  }
}
