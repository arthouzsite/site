import { formatDateRange, formatMonthYear, indexLetter, resolveExhibitionStatus, STATUS_BADGE } from '@arthouz/shared'
import type {
  PublicArtist, PublicExhibition, PublicExhibitionDetail, PublicFair, PublicLocation, PublicNews,
} from '@arthouz/shared'
import type { Prisma } from '../generated/prisma/client'
import { toPublicImage } from './public.images'

const BY_SORT_ORDER = { orderBy: { sortOrder: 'asc' } } as const

export const PUBLIC_EXHIBITION_INCLUDE = {
  heroImage: true,
  artists: {
    ...BY_SORT_ORDER,
    where: { artist: { isPublished: true } },
    include: { artist: { select: { name: true, slug: true } } },
  },
} satisfies Prisma.ExhibitionInclude
export type PublicExhibitionRow = Prisma.ExhibitionGetPayload<{ include: typeof PUBLIC_EXHIBITION_INCLUDE }>

export const PUBLIC_EXHIBITION_DETAIL_INCLUDE = {
  ...PUBLIC_EXHIBITION_INCLUDE,
  works: {
    ...BY_SORT_ORDER,
    where: { artist: { isPublished: true } },
    include: { image: true, artist: { select: { name: true } } },
  },
} satisfies Prisma.ExhibitionInclude
export type PublicExhibitionDetailRow = Prisma.ExhibitionGetPayload<{ include: typeof PUBLIC_EXHIBITION_DETAIL_INCLUDE }>

export const PUBLIC_NEWS_INCLUDE = {
  image: true,
  exhibition: { select: { slug: true, title: true, isPublished: true } },
} satisfies Prisma.NewsInclude
export type PublicNewsRow = Prisma.NewsGetPayload<{ include: typeof PUBLIC_NEWS_INCLUDE }>

export const PUBLIC_ARTIST_INCLUDE = { portraitImage: true } satisfies Prisma.ArtistInclude
export type PublicArtistRow = Prisma.ArtistGetPayload<{ include: typeof PUBLIC_ARTIST_INCLUDE }>

export function toPublicExhibition(row: PublicExhibitionRow, today: Date): PublicExhibition {
  const status = resolveExhibitionStatus(row, today)
  const artists = row.artists.map((a) => ({ name: a.artist.name, slug: a.artist.slug }))
  return {
    id: row.id, slug: row.slug, title: row.title, subtitle: row.subtitle, city: row.city, country: row.country,
    type: row.type, status, statusLabel: STATUS_BADGE[status].label,
    datesLabel: row.datesLabel ?? formatDateRange(row.startDate, row.endDate),
    venue: row.venue, blurb: row.blurb, body: row.body,
    artistLine: artists.map((a) => a.name).join(', '), artists, image: toPublicImage(row.heroImage),
  }
}

export function toPublicPress(row: PublicNewsRow) {
  return { slug: row.slug, title: row.title, excerpt: row.excerpt, monthLabel: formatMonthYear(row.publishedAt) }
}

export function toPublicExhibitionDetail(
  row: PublicExhibitionDetailRow,
  press: ReadonlyArray<PublicNewsRow>,
  today: Date,
): PublicExhibitionDetail {
  const base = toPublicExhibition(row, today)
  return {
    ...base,
    meta: [
      { k: 'Location', v: `${row.city}, ${row.country}` },
      { k: 'Venue', v: row.venue },
      { k: 'Dates', v: base.datesLabel },
      { k: 'Format', v: row.type === 'SOLO' ? 'Solo exhibition' : 'Group exhibition' },
    ],
    works: row.works.map((w) => ({
      id: w.id, title: w.title, year: w.year, artist: w.artist.name, medium: w.medium, image: toPublicImage(w.image),
    })),
    press: press.map(toPublicPress),
  }
}

export function toPublicArtist(row: PublicArtistRow): PublicArtist {
  return {
    id: row.id, slug: row.slug, name: row.name, sortName: row.sortName, medium: row.medium, base: row.base,
    born: row.born, lede: row.lede, bio: row.bio, image: toPublicImage(row.portraitImage),
    indexLetter: indexLetter(row.sortName),
  }
}

export function toPublicFair(row: Prisma.FairGetPayload<{ include: { image: true } }>): PublicFair {
  const place = [row.venue, row.city].filter(Boolean).join(', ')
  return {
    id: row.id, slug: row.slug, title: row.title, where: [place, row.dateLabel].filter(Boolean).join(' · '), booth: row.booth,
    text: row.text, image: toPublicImage(row.image),
  }
}

export function toPublicNews(row: PublicNewsRow): PublicNews {
  return {
    id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt, monthLabel: formatMonthYear(row.publishedAt),
    externalUrl: row.externalUrl,
    exhibition: row.exhibition?.isPublished ? { slug: row.exhibition.slug, title: row.exhibition.title } : null,
    image: toPublicImage(row.image),
  }
}

export function toPublicLocation(row: Prisma.LocationGetPayload<{ include: { image: true } }>): PublicLocation {
  return {
    id: row.id, slug: row.slug, city: row.city, address: row.address, phone: row.phone,
    tel: row.tel === '' ? null : row.tel, days: row.days, hours: row.hours, mapUrl: row.mapUrl,
    image: toPublicImage(row.image),
  }
}
