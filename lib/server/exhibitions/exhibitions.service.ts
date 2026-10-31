import { slugify, type ExhibitionInput } from '@/lib/shared'
import { parsePagination } from '@/lib/server/common/pagination'
import { omit } from '@/lib/server/common/omit'
import { uniqueSlug } from '@/lib/server/common/slugs'
import { assertMediaExists } from '@/lib/server/common/media-exists'
import { ApiException, badRequest, conflict, notFound } from '@/lib/server/http/errors'
import { withMeta } from '@/lib/server/http/route'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { listWhere, type ExhibitionListQuery } from './exhibition-status'
import { EXHIBITION_INCLUDE, toAdminExhibition } from './exhibitions.mapper'
import { exhibitionTagsWithArtists, linkedArtistSlugs } from '@/lib/server/revalidate/related-tags'

const NOT_FOUND = 'Exhibition not found'
const UNKNOWN_ARTIST = 'UNKNOWN_ARTIST'

// Scalars written on create; artists have their own join handling.
function createData(input: ExhibitionInput, slug: string) {
  return { ...omit(input, ['artistIds', 'slug']), slug }
}

// PATCH never touches publish state (own endpoints) or artists (setArtists).
function updateData(input: ExhibitionInput, slug: string) {
  return omit(createData(input, slug), ['isPublished'])
}

async function find(id: string) {
  const row = await prisma.exhibition.findUnique({ where: { id }, include: EXHIBITION_INCLUDE })
  if (!row) throw notFound(NOT_FOUND)
  return row
}

async function validArtistIds(requested: string[]): Promise<string[]> {
  const ids = Array.from(new Set(requested))
  const found = await prisma.artist.findMany({ where: { id: { in: ids } }, select: { id: true } })
  const known = new Set(found.map((a) => a.id))
  const missing = ids.filter((i) => !known.has(i))
  if (missing.length > 0) {
    throw badRequest(UNKNOWN_ARTIST, `Unknown artist ids: ${missing.join(', ')}`, { missingIds: missing })
  }
  return ids
}

// Works reference an artist of the exhibition (WORK_ARTIST_NOT_IN_EXHIBITION), so dropping that artist would orphan them.
async function assertNoWorksForRemoved(exhibitionId: string, keptArtistIds: string[]): Promise<void> {
  const blocking = await prisma.exhibitionWork.findMany({
    where: { exhibitionId, artistId: { notIn: keptArtistIds } },
    select: { artistId: true },
    distinct: ['artistId'],
  })
  if (blocking.length === 0) return
  throw conflict('ARTIST_HAS_WORKS', "Remove or reassign this exhibition's works by these artists first", {
    artistIds: blocking.map((w) => w.artistId),
  })
}

async function list(query: ExhibitionListQuery) {
  const { page, limit, skip } = parsePagination(query)
  const where = listWhere(query)
  const [rows, total] = await prisma.$transaction([
    prisma.exhibition.findMany({ where, include: EXHIBITION_INCLUDE, orderBy: [{ startDate: 'desc' }, { id: 'asc' }], skip, take: limit }),
    prisma.exhibition.count({ where }),
  ])
  return withMeta(rows.map(toAdminExhibition), { page, limit, total })
}

async function get(id: string) {
  return toAdminExhibition(await find(id))
}

async function create(input: ExhibitionInput) {
  const artistIds = await validArtistIds(input.artistIds)
  await assertMediaExists(prisma, input.heroImageId, 'hero image')
  const slug = await uniqueSlug(prisma, 'exhibition', input.slug ?? input.title)
  const created = await prisma.exhibition.create({
    data: {
      ...createData(input, slug),
      artists: { create: artistIds.map((artistId, sortOrder) => ({ artistId, sortOrder })) },
    },
    include: EXHIBITION_INCLUDE,
  })
  revalidateSite(await exhibitionTagsWithArtists(prisma, created.id, [created.slug]))
  return toAdminExhibition(created)
}

async function update(id: string, input: ExhibitionInput) {
  const existing = await find(id)
  await assertMediaExists(prisma, input.heroImageId, 'hero image')
  const wantsNewSlug = input.slug !== undefined && slugify(input.slug) !== existing.slug
  const slug = wantsNewSlug ? await uniqueSlug(prisma, 'exhibition', input.slug ?? '', id) : existing.slug
  const updated = await prisma.exhibition.update({
    where: { id },
    data: updateData(input, slug),
    include: EXHIBITION_INCLUDE,
  })
  revalidateSite(await exhibitionTagsWithArtists(prisma, id, [existing.slug, updated.slug]))
  return toAdminExhibition(updated)
}

async function setArtists(id: string, requestedIds: string[]) {
  const existing = await find(id)
  const artistIds = await validArtistIds(requestedIds)
  const previousArtistSlugs = await linkedArtistSlugs(prisma, id)
  await assertNoWorksForRemoved(id, artistIds)
  await prisma.$transaction([
    prisma.exhibitionArtist.deleteMany({ where: { exhibitionId: id } }),
    prisma.exhibitionArtist.createMany({
      data: artistIds.map((artistId, sortOrder) => ({ exhibitionId: id, artistId, sortOrder })),
    }),
  ])
  revalidateSite(await exhibitionTagsWithArtists(prisma, id, [existing.slug], previousArtistSlugs))
  return get(id)
}

async function publish(id: string, isPublished: boolean) {
  const existing = await find(id)
  const updated = await prisma.exhibition.update({ where: { id }, data: { isPublished }, include: EXHIBITION_INCLUDE })
  revalidateSite(await exhibitionTagsWithArtists(prisma, id, [existing.slug]))
  return toAdminExhibition(updated)
}

async function bulkPublish(requestedIds: string[], isPublished: boolean) {
  const ids = Array.from(new Set(requestedIds))
  const { rows, count } = await prisma.$transaction(async (tx) => {
    const found = await tx.exhibition.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } })
    if (found.length !== ids.length) {
      const known = new Set(found.map((r) => r.id))
      throw new ApiException(404, 'NOT_FOUND', NOT_FOUND, undefined, { missingIds: ids.filter((i) => !known.has(i)) })
    }
    const result = await tx.exhibition.updateMany({ where: { id: { in: ids } }, data: { isPublished } })
    return { rows: found, count: result.count }
  })
  const tags = await Promise.all(rows.map((r) => exhibitionTagsWithArtists(prisma, r.id, [r.slug])))
  revalidateSite(tags.flat())
  return { updated: count }
}

async function remove(id: string) {
  const existing = await find(id)
  const tags = await exhibitionTagsWithArtists(prisma, id, [existing.slug])
  await prisma.exhibition.delete({ where: { id } })
  revalidateSite(tags)
  return { id }
}

export const exhibitionsService = { list, get, create, update, setArtists, publish, bulkPublish, remove }
