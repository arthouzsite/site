import { tagsFor, type TagEntity } from '@/lib/shared/api/tags'
import { prisma } from '@/lib/server/prisma'

const ALL_ENTITIES: readonly TagEntity[] = ['exhibition', 'artist', 'artwork', 'fair', 'service', 'news', 'location', 'setting', 'media']

type Slugged = { slug: string }

function slugTags(entity: TagEntity, rows: readonly Slugged[]): string[] {
  return rows.flatMap((row) => tagsFor(entity, row.slug))
}

/** Every cache tag the site can carry: all entity tags plus the per-slug detail tags of every stored row. */
export async function allSiteTags(): Promise<string[]> {
  const select = { slug: true } as const
  const [exhibitions, artists, services, news] = await Promise.all([
    prisma.exhibition.findMany({ select }),
    prisma.artist.findMany({ select }),
    prisma.service.findMany({ select }),
    prisma.news.findMany({ select }),
  ])
  const tags = [
    ...ALL_ENTITIES.flatMap((entity) => tagsFor(entity)),
    ...slugTags('exhibition', exhibitions),
    ...slugTags('artist', artists),
    ...slugTags('service', services),
    ...slugTags('news', news),
  ]
  return Array.from(new Set(tags))
}
