import { formatDateRange, formatMonthYear, indexLetter, resolveExhibitionStatus, STATUS_BADGE } from '@/lib/shared'
import type {
  PublicArtist, PublicExhibition, PublicExhibitionDetail, PublicFair, PublicFairDetail, PublicLocation, PublicPrintCategory, PublicNews, PublicService,
} from '@/lib/shared'
import type { Prisma } from '@/lib/server/generated/prisma/client'
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
    // Videos are library-only: never expose one as a work image even if a row points at it.
    where: { artist: { isPublished: true }, image: { kind: 'IMAGE' } },
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

// One include for the list and the detail: the list's gallery rides the same query, so there is no per-fair lookup.
export const PUBLIC_FAIR_INCLUDE = {
  image: true,
  gallery: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { media: true } },
} satisfies Prisma.FairInclude

export function toPublicFair(row: Prisma.FairGetPayload<{ include: typeof PUBLIC_FAIR_INCLUDE }>): PublicFair {
  const place = [row.venue, row.city].filter(Boolean).join(', ')
  return {
    id: row.id, slug: row.slug, title: row.title, where: [place, row.dateLabel].filter(Boolean).join(' · '), booth: row.booth,
    text: row.text, image: toPublicImage(row.image), gallery: row.gallery.flatMap((g) => toPublicImage(g.media) ?? []),
  }
}

export const PUBLIC_PRINT_INCLUDE = {
  images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { media: true } },
} satisfies Prisma.PrintCategoryInclude

export function toPublicPrintCategory(row: Prisma.PrintCategoryGetPayload<{ include: typeof PUBLIC_PRINT_INCLUDE }>): PublicPrintCategory {
  return { id: row.id, slug: row.slug, name: row.name, images: row.images.flatMap((image) => toPublicImage(image.media) ?? []) }
}

export const toPublicFairDetail = (row: Prisma.FairGetPayload<{ include: typeof PUBLIC_FAIR_INCLUDE }>): PublicFairDetail => toPublicFair(row)

export function toPublicService(row: Prisma.ServiceGetPayload<{ include: { image: true } }>): PublicService {
  return {
    slug: row.slug, title: row.title, summary: row.summary, body: row.body, image: toPublicImage(row.image),
    ctaLabel: row.ctaLabel, ctaHref: row.ctaHref,
    contact: { name: row.contactName, phone: row.contactPhone, email: row.contactEmail },
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
