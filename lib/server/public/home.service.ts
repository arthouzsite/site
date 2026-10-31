import type { PublicExhibition, PublicHome } from '@/lib/shared'
import { resolveExhibitionStatus } from '@/lib/shared'
import { prisma } from '@/lib/server/prisma'
import { settingsService } from '@/lib/server/settings/settings.service'
import { HOME_COUNTRY, HOME_NEWS_COUNT, HOME_RECENT_COUNT } from './public.constants'
import {
  PUBLIC_EXHIBITION_INCLUDE, PUBLIC_NEWS_INCLUDE, toPublicExhibition, toPublicLocation, toPublicNews,
  type PublicExhibitionRow,
} from './public.mapper'
import { resolveImages } from './public.images'
import type { HeroLayout, HomeFocusSetting } from './public.settings'

const byStartDesc = (a: PublicExhibitionRow, b: PublicExhibitionRow) => b.startDate.getTime() - a.startDate.getTime()
const byStartAsc = (a: PublicExhibitionRow, b: PublicExhibitionRow) => a.startDate.getTime() - b.startDate.getTime()
const byEndDesc = (a: PublicExhibitionRow, b: PublicExhibitionRow) => b.endDate.getTime() - a.endDate.getTime()

export async function buildHome(today: Date): Promise<PublicHome> {
  const settings = await settingsService.getAll()
  const focus = settings.homeFocus as HomeFocusSetting
  const [exhibitions, focusArtist, artistsLine, locations, news, images] = await Promise.all([
    prisma.exhibition.findMany({
      where: { isPublished: true },
      include: PUBLIC_EXHIBITION_INCLUDE,
      orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
    }),
    focus.artistId
      ? prisma.artist.findFirst({ where: { id: focus.artistId, isPublished: true }, select: { slug: true, name: true } })
      : Promise.resolve(null),
    prisma.artist.findMany({
      where: { isPublished: true },
      select: { name: true, slug: true },
      orderBy: [{ sortName: 'asc' }, { id: 'asc' }],
      take: settings.homeArtistCount as number,
    }),
    prisma.location.findMany({ include: { image: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    prisma.news.findMany({
      where: { isPublished: true },
      include: PUBLIC_NEWS_INCLUDE,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: HOME_NEWS_COUNT,
    }),
    resolveImages([focus.imageId]),
  ])

  const withStatus = (row: PublicExhibitionRow) => ({ row, status: resolveExhibitionStatus(row, today) })
  const dto = (row: PublicExhibitionRow): PublicExhibition => toPublicExhibition(row, today)
  const sorted = [...exhibitions].sort(byStartDesc)
  const statused = sorted.map(withStatus)
  const override = settings.homeHeroExhibitionId as string | null
  const upcoming = statused.filter((s) => s.status === 'UPCOMING').map((s) => s.row).sort(byStartAsc)[0] ?? null
  const latestPast = statused.filter((s) => s.status === 'PAST').map((s) => s.row).sort(byEndDesc)[0] ?? null
  const hero =
    sorted.find((e) => e.id === override) ?? statused.find((s) => s.status === 'CURRENT')?.row ?? upcoming ?? latestPast

  return {
    hero: hero ? dto(hero) : null,
    heroLayout: settings.heroLayout as HeroLayout,
    upcoming: upcoming ? dto(upcoming) : null,
    recent: statused
      .filter((s) => s.status === 'PAST')
      .map((s) => s.row)
      .sort(byEndDesc)
      .slice(0, HOME_RECENT_COUNT)
      .map(dto),
    world: sorted.filter((e) => e.country !== HOME_COUNTRY).map(dto),
    focus: {
      artist: focusArtist ? { slug: focusArtist.slug, name: focusArtist.name } : null,
      text: focus.text,
      mediumLabel: focus.mediumLabel,
      baseLabel: focus.baseLabel,
      image: focus.imageId ? (images.get(focus.imageId) ?? null) : null,
    },
    artistsLine: artistsLine.map(({ name, slug }) => ({ name, slug })),
    locations: locations.map(toPublicLocation),
    news: news.map(toPublicNews),
  }
}
