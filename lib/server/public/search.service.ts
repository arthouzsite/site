import type { PublicSearch } from '@/lib/shared'
import type { Prisma } from '@/lib/server/generated/prisma/client'
import { prisma } from '@/lib/server/prisma'
import { SEARCH_ARTIST_LIMIT, SEARCH_NEWS_LIMIT } from './public.constants'

type Group = PublicSearch['groups'][number]

const matches = (q: string) => ({ contains: q, mode: 'insensitive' }) as const

function exhibitionWhere(q: string): Prisma.ExhibitionWhereInput {
  return {
    isPublished: true,
    OR: [
      { title: matches(q) },
      { subtitle: matches(q) },
      { city: matches(q) },
      { country: matches(q) },
      { artists: { some: { artist: { isPublished: true, name: matches(q) } } } },
    ],
  }
}

export async function search(rawQuery: string): Promise<PublicSearch> {
  const q = rawQuery.trim()
  if (!q) return { groups: [] }
  const [artists, exhibitions, news, services] = await Promise.all([
    prisma.artist.findMany({
      where: { isPublished: true, name: matches(q) },
      select: { name: true, slug: true },
      orderBy: [{ sortName: 'asc' }, { id: 'asc' }],
      take: SEARCH_ARTIST_LIMIT,
    }),
    prisma.exhibition.findMany({
      where: exhibitionWhere(q),
      select: { title: true, slug: true },
      orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
    }),
    prisma.news.findMany({
      where: { isPublished: true, OR: [{ title: matches(q) }, { excerpt: matches(q) }] },
      select: { title: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: SEARCH_NEWS_LIMIT,
    }),
    prisma.service.findMany({
      where: { isPublished: true, OR: [{ title: matches(q) }, { summary: matches(q) }] },
      select: { title: true, slug: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
  ])
  const groups: Group[] = [
    { label: 'Artists', items: artists.map((a) => ({ label: a.name, href: `/artists/${a.slug}` })) },
    { label: 'Exhibitions', items: exhibitions.map((e) => ({ label: e.title, href: `/exhibitions/${e.slug}` })) },
    { label: 'News', items: news.map((n) => ({ label: n.title, href: '/news' })) },
    { label: 'Services', items: services.map((s) => ({ label: s.title, href: `/services/${s.slug}` })) },
  ]
  return { groups: groups.filter((g) => g.items.length > 0) }
}
