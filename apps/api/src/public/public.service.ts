import { Injectable, NotFoundException } from '@nestjs/common'
import type {
  PublicAbout, PublicArtistDetail, PublicArtistList, PublicExhibitionDetail, PublicExhibitionList, PublicFair,
  PublicLocation, PublicNews, PublicService as PublicServiceDto, PublicSettings,
} from '@arthouz/shared'
import { indexLetter, resolveExhibitionStatus } from '@arthouz/shared'
import { PrismaService } from '../common/prisma.service'
import { today } from '../config/clock'
import { SettingsService } from '../settings/settings.service'
import { resolveImages, toPublicImage } from './public.images'
import {
  PUBLIC_ARTIST_INCLUDE, PUBLIC_EXHIBITION_DETAIL_INCLUDE, PUBLIC_EXHIBITION_INCLUDE, PUBLIC_NEWS_INCLUDE,
  toPublicArtist, toPublicExhibition, toPublicExhibitionDetail, toPublicFair, toPublicLocation, toPublicNews, toPublicService,
} from './public.mapper'
import type { PublicExhibitionsQuery } from './public.queries'
import type {
  AboutGallerySetting, AboutProprietorSetting, AboutPublicationsSetting, AboutServicesSetting, ArtistIndexLayout,
  FooterSetting, HeroLayout, SiteSetting,
} from './public.settings'

const NOT_FOUND = 'Not found'
const NON_LETTER = '#'
const START_DESC = [{ startDate: 'desc' }, { id: 'asc' }] as const
const STATUS_RANK = { CURRENT: 0, UPCOMING: 1, PAST: 2 } as const

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async exhibitions(query: PublicExhibitionsQuery): Promise<PublicExhibitionList> {
    const now = today()
    const rows = await this.prisma.exhibition.findMany({
      where: { isPublished: true },
      include: PUBLIC_EXHIBITION_INCLUDE,
      orderBy: [...START_DESC],
    })
    // Status rank (current, upcoming, past); the query's startDate-desc order is kept within each group (stable sort).
    const ranked = [...rows].sort((a, b) => STATUS_RANK[resolveExhibitionStatus(a, now)] - STATUS_RANK[resolveExhibitionStatus(b, now)])
    const wantedCity = query.city?.toLowerCase()
    const cities = [...new Set(ranked.map((r) => r.city))]
    const items = ranked
      .filter((r) => !wantedCity || r.city.toLowerCase() === wantedCity)
      .filter((r) => !query.status || resolveExhibitionStatus(r, now) === query.status)
      .map((r) => toPublicExhibition(r, now))
    return { items, cities }
  }

  async exhibition(slug: string): Promise<PublicExhibitionDetail> {
    const row = await this.prisma.exhibition.findFirst({
      where: { slug, isPublished: true },
      include: PUBLIC_EXHIBITION_DETAIL_INCLUDE,
    })
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND })
    const press = await this.prisma.news.findMany({
      where: { exhibitionId: row.id, isPublished: true },
      include: PUBLIC_NEWS_INCLUDE,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    })
    return toPublicExhibitionDetail(row, press, today())
  }

  async artists(q: string): Promise<PublicArtistList> {
    const [featured, flat, layout] = await Promise.all([
      this.prisma.artist.findMany({
        where: { isPublished: true, isFeatured: true },
        include: PUBLIC_ARTIST_INCLUDE,
        orderBy: [{ featuredOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.artist.findMany({
        where: { isPublished: true, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
        include: PUBLIC_ARTIST_INCLUDE,
        orderBy: [{ sortName: 'asc' }, { id: 'asc' }],
      }),
      this.settings.get('artistIndexLayout'),
    ])
    const flatDtos = flat.map(toPublicArtist)
    return {
      featured: featured.map(toPublicArtist),
      groups: groupByLetter(flatDtos),
      flat: flatDtos,
      layout: layout as ArtistIndexLayout,
    }
  }

  async artist(slug: string): Promise<PublicArtistDetail> {
    const row = await this.prisma.artist.findFirst({
      where: { slug, isPublished: true },
      include: {
        ...PUBLIC_ARTIST_INCLUDE,
        artworks: { where: { isPublished: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], include: { image: true } },
        exhibitions: {
          where: { exhibition: { isPublished: true } },
          include: { exhibition: true },
        },
      },
    })
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND })
    const now = today()
    const exhibitions = row.exhibitions
      .map((link) => link.exhibition)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
      .map((e) => ({ slug: e.slug, title: e.title, city: e.city, status: resolveExhibitionStatus(e, now) }))
    return {
      ...toPublicArtist(row),
      exhibitions,
      works: row.artworks.map((w) => ({
        id: w.id, title: w.title, year: w.year, medium: w.medium, size: w.size, image: toPublicImage(w.image),
      })),
    }
  }

  async fairs(): Promise<PublicFair[]> {
    const rows = await this.prisma.fair.findMany({
      where: { isPublished: true },
      include: { image: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toPublicFair)
  }

  async services(): Promise<PublicServiceDto[]> {
    const rows = await this.prisma.service.findMany({
      where: { isPublished: true },
      include: { image: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toPublicService)
  }

  async service(slug: string): Promise<PublicServiceDto> {
    const row = await this.prisma.service.findFirst({ where: { slug, isPublished: true }, include: { image: true } })
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND })
    return toPublicService(row)
  }

  async news(): Promise<PublicNews[]> {
    const rows = await this.prisma.news.findMany({
      where: { isPublished: true },
      include: PUBLIC_NEWS_INCLUDE,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    })
    return rows.map(toPublicNews)
  }

  async locations(): Promise<PublicLocation[]> {
    const rows = await this.prisma.location.findMany({
      include: { image: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(toPublicLocation)
  }

  async about(): Promise<PublicAbout> {
    const all = await this.settings.getAll()
    const gallery = all['about.gallery'] as AboutGallerySetting
    const proprietor = all['about.proprietor'] as AboutProprietorSetting
    const services = all['about.services'] as AboutServicesSetting
    const publications = all['about.publications'] as AboutPublicationsSetting
    const images = await resolveImages(this.prisma, [gallery, proprietor, services, publications].map((s) => s.imageId))
    const image = (id: string | null) => (id ? (images.get(id) ?? null) : null)
    const { imageId: g, ...galleryRest } = gallery
    const { imageId: p, ...proprietorRest } = proprietor
    const { imageId: s, ...servicesRest } = services
    const { imageId: b, ...publicationsRest } = publications
    return {
      gallery: { ...galleryRest, image: image(g) },
      proprietor: { ...proprietorRest, image: image(p) },
      services: { ...servicesRest, image: image(s) },
      publications: { ...publicationsRest, image: image(b) },
    }
  }

  async siteSettings(): Promise<PublicSettings> {
    const all = await this.settings.getAll()
    const { ogImageId, ...site } = all.site as SiteSetting
    const images = await resolveImages(this.prisma, [ogImageId])
    return {
      heroLayout: all.heroLayout as HeroLayout,
      artistIndexLayout: all.artistIndexLayout as ArtistIndexLayout,
      footer: all.footer as FooterSetting,
      site: { ...site, ogImage: ogImageId ? (images.get(ogImageId) ?? null) : null },
    }
  }
}

function groupByLetter<T extends { sortName: string }>(items: ReadonlyArray<T>): Array<{ letter: string; items: T[] }> {
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const letter = indexLetter(item.sortName)
    buckets.set(letter, [...(buckets.get(letter) ?? []), item])
  }
  const rank = (letter: string) => (letter === NON_LETTER ? '￿' : letter)
  return [...buckets.entries()]
    .sort(([a], [b]) => rank(a).localeCompare(rank(b)))
    .map(([letter, group]) => ({ letter, items: group }))
}
