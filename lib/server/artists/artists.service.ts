import { slugify, tagsFor, type ArtistInput } from '@/lib/shared'
import { assertMediaExists } from '@/lib/server/common/media-exists'
import { parsePagination } from '@/lib/server/common/pagination'
import { uniqueSlug } from '@/lib/server/common/slugs'
import { badRequest, conflict, notFound } from '@/lib/server/http/errors'
import { withMeta } from '@/lib/server/http/route'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { ARTIST_INCLUDE, toAdminArtist } from './artists.mapper'
import { artistListWhere, type ArtistListQuery } from './artists.query'
import { artistTagsWithExhibitions } from '@/lib/server/revalidate/related-tags'

const NOT_FOUND = 'Artist not found'
const UNKNOWN_ARTIST = 'UNKNOWN_ARTIST'
const NOT_FEATURED_ORDER = 0

// Scalars written by create/PATCH. Publish and feature state have their own endpoints.
const NON_WRITABLE_KEYS = ['slug', 'sortName', 'isPublished', 'isFeatured', 'featuredOrder'] as const

function writableData(input: ArtistInput, slug: string) {
  const rest = Object.fromEntries(Object.entries(input).filter(([key]) => !(NON_WRITABLE_KEYS as readonly string[]).includes(key)))
  return { ...(rest as Omit<ArtistInput, (typeof NON_WRITABLE_KEYS)[number]>), slug, sortName: input.sortName?.trim() || input.name }
}

async function find(id: string) {
  const row = await prisma.artist.findUnique({ where: { id }, include: ARTIST_INCLUDE })
  if (!row) throw notFound(NOT_FOUND)
  return row
}

export async function listArtists(query: ArtistListQuery) {
  const { page, limit, skip } = parsePagination(query)
  const where = artistListWhere(query)
  const [rows, total] = await prisma.$transaction([
    prisma.artist.findMany({ where, include: ARTIST_INCLUDE, orderBy: [{ sortName: 'asc' }, { id: 'asc' }], skip, take: limit }),
    prisma.artist.count({ where }),
  ])
  return withMeta(rows.map(toAdminArtist), { page, limit, total })
}

export async function getArtist(id: string) {
  return toAdminArtist(await find(id))
}

export async function createArtist(input: ArtistInput) {
  await assertMediaExists(prisma, input.portraitImageId, 'portrait image')
  const slug = await uniqueSlug(prisma, 'artist', input.slug ?? input.name)
  const created = await prisma.artist.create({
    data: { ...writableData(input, slug), isPublished: input.isPublished },
    include: ARTIST_INCLUDE,
  })
  revalidateSite(tagsFor('artist', created.slug))
  return toAdminArtist(created)
}

export async function updateArtist(id: string, input: ArtistInput) {
  const existing = await find(id)
  await assertMediaExists(prisma, input.portraitImageId, 'portrait image')
  const requested = input.slug ?? (input.name !== existing.name ? input.name : undefined)
  const wantsNewSlug = requested !== undefined && slugify(requested) !== existing.slug
  const slug = wantsNewSlug ? await uniqueSlug(prisma, 'artist', requested, id) : existing.slug
  const updated = await prisma.artist.update({ where: { id }, data: writableData(input, slug), include: ARTIST_INCLUDE })
  revalidateSite(await artistTagsWithExhibitions(prisma, id, [existing.slug, updated.slug]))
  return toAdminArtist(updated)
}

export async function publishArtist(id: string, isPublished: boolean) {
  const existing = await find(id)
  const updated = await prisma.artist.update({ where: { id }, data: { isPublished }, include: ARTIST_INCLUDE })
  revalidateSite(await artistTagsWithExhibitions(prisma, id, [existing.slug]))
  return toAdminArtist(updated)
}

export async function setArtistFeatured(id: string, isFeatured: boolean) {
  const existing = await find(id)
  if (existing.isFeatured === isFeatured) return toAdminArtist(existing)
  await prisma.$transaction(async (tx) => {
    if (isFeatured) {
      const last = await tx.artist.aggregate({ where: { isFeatured: true }, _max: { featuredOrder: true } })
      await tx.artist.update({ where: { id }, data: { isFeatured: true, featuredOrder: (last._max.featuredOrder ?? 0) + 1 } })
      return
    }
    await tx.artist.update({ where: { id }, data: { isFeatured: false, featuredOrder: NOT_FEATURED_ORDER } })
    const remaining = await tx.artist.findMany({ where: { isFeatured: true }, orderBy: [{ featuredOrder: 'asc' }, { id: 'asc' }], select: { id: true } })
    for (const [index, row] of remaining.entries()) {
      await tx.artist.update({ where: { id: row.id }, data: { featuredOrder: index + 1 } })
    }
  })
  revalidateSite(tagsFor('artist', existing.slug))
  return getArtist(id)
}

export async function setFeaturedOrder(requestedIds: string[]) {
  const ids = Array.from(new Set(requestedIds))
  const found = await prisma.artist.findMany({ where: { id: { in: ids } }, select: { id: true } })
  const known = new Set(found.map((a) => a.id))
  const missing = ids.filter((i) => !known.has(i))
  if (missing.length > 0) {
    throw badRequest(UNKNOWN_ARTIST, `Unknown artist ids: ${missing.join(', ')}`, { missingIds: missing })
  }
  const before = await prisma.artist.findMany({ where: { OR: [{ isFeatured: true }, { id: { in: ids } }] }, select: { slug: true } })
  await prisma.$transaction([
    prisma.artist.updateMany({ where: { id: { notIn: ids } }, data: { isFeatured: false, featuredOrder: NOT_FEATURED_ORDER } }),
    ...ids.map((id, index) => prisma.artist.update({ where: { id }, data: { isFeatured: true, featuredOrder: index + 1 } })),
  ])
  revalidateSite(before.flatMap((a) => tagsFor('artist', a.slug)))
  const rows = await prisma.artist.findMany({ where: { isFeatured: true }, include: ARTIST_INCLUDE, orderBy: { featuredOrder: 'asc' } })
  return rows.map(toAdminArtist)
}

export async function removeArtist(id: string) {
  const existing = await find(id)
  const [links, workCount, artworkCount] = await Promise.all([
    prisma.exhibitionArtist.findMany({ where: { artistId: id }, include: { exhibition: { select: { id: true, title: true } } } }),
    prisma.exhibitionWork.count({ where: { artistId: id } }),
    prisma.artwork.count({ where: { artistId: id } }),
  ])
  if (links.length > 0 || workCount > 0 || artworkCount > 0) {
    throw conflict('ARTIST_IN_USE', 'Artist is used by exhibitions or has artworks', {
      exhibitions: links.map((l) => ({ id: l.exhibition.id, title: l.exhibition.title })),
      workCount,
      artworkCount,
    })
  }
  const tags = await artistTagsWithExhibitions(prisma, id, [existing.slug])
  await prisma.artist.delete({ where: { id } })
  revalidateSite(tags)
  return { id }
}
