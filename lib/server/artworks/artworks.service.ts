import { tagsFor, type ArtworkInput } from '@/lib/shared'
import { assertExactOrder } from '@/lib/server/common/exact-order'
import { omit } from '@/lib/server/common/omit'
import { assertMediaExists } from '@/lib/server/common/media-exists'
import { conflict, notFound } from '@/lib/server/http/errors'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { ARTWORK_INCLUDE, toAdminArtwork } from './artworks.mapper'

const ARTIST_NOT_FOUND = 'Artist not found'
const ARTWORK_NOT_FOUND = 'Artwork not found'

export type ArtworkBody = Omit<ArtworkInput, 'artistId'>

// Placement (sortOrder), owner (artistId) and publish state are not set via the body.
function writableData(input: ArtworkBody) {
  return omit(input, ['sortOrder', 'isPublished'])
}

async function artist(id: string) {
  const row = await prisma.artist.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!row) throw notFound(ARTIST_NOT_FOUND)
  return row
}

async function find(id: string) {
  const row = await prisma.artwork.findUnique({ where: { id }, include: { ...ARTWORK_INCLUDE, artist: { select: { slug: true } } } })
  if (!row) throw notFound(ARTWORK_NOT_FOUND)
  return row
}

async function list(artistId: string) {
  await artist(artistId)
  const rows = await prisma.artwork.findMany({
    where: { artistId },
    include: ARTWORK_INCLUDE,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows.map(toAdminArtwork)
}

async function create(artistId: string, input: ArtworkBody) {
  const { slug } = await artist(artistId)
  await assertMediaExists(prisma, input.imageId, 'image')
  const last = await prisma.artwork.aggregate({ where: { artistId }, _max: { sortOrder: true } })
  const created = await prisma.artwork.create({
    data: { ...writableData(input), artistId, isPublished: input.isPublished, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    include: ARTWORK_INCLUDE,
  })
  revalidateSite(tagsFor('artwork', slug))
  return toAdminArtwork(created)
}

async function update(id: string, input: ArtworkBody) {
  const existing = await find(id)
  await assertMediaExists(prisma, input.imageId, 'image')
  const updated = await prisma.artwork.update({ where: { id }, data: writableData(input), include: ARTWORK_INCLUDE })
  revalidateSite(tagsFor('artwork', existing.artist.slug))
  return toAdminArtwork(updated)
}

async function publish(id: string, isPublished: boolean) {
  const existing = await find(id)
  const updated = await prisma.artwork.update({ where: { id }, data: { isPublished }, include: ARTWORK_INCLUDE })
  revalidateSite(tagsFor('artwork', existing.artist.slug))
  return toAdminArtwork(updated)
}

async function reorder(artistId: string, ids: string[]) {
  const { slug } = await artist(artistId)
  const current = await prisma.artwork.findMany({ where: { artistId }, select: { id: true } })
  assertExactOrder(ids, current.map((r) => r.id), 'artwork of this artist')
  await prisma.$transaction(ids.map((id, sortOrder) => prisma.artwork.update({ where: { id }, data: { sortOrder } })))
  revalidateSite(tagsFor('artwork', slug))
  return list(artistId)
}

async function remove(id: string) {
  const existing = await find(id)
  const workCount = await prisma.exhibitionWork.count({ where: { artworkId: id } })
  if (workCount > 0) {
    throw conflict('ARTWORK_IN_USE', 'Artwork is used by exhibition works', { workCount })
  }
  await prisma.artwork.delete({ where: { id } })
  revalidateSite(tagsFor('artwork', existing.artist.slug))
  return { id }
}

export const artworksService = { list, create, update, publish, reorder, remove }
