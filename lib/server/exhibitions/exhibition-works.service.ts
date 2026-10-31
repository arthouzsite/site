import type { ExhibitionWorkInput } from '@/lib/shared'
import { assertExactOrder } from '@/lib/server/common/exact-order'
import { assertMediaExists } from '@/lib/server/common/media-exists'
import { badRequest, notFound } from '@/lib/server/http/errors'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { exhibitionTagsWithArtists } from '@/lib/server/revalidate/related-tags'

const WORK_NOT_FOUND = 'Work not found'
const EXHIBITION_NOT_FOUND = 'Exhibition not found'
const ARTWORK_NOT_FOUND = 'Artwork not found'
const WORK_IMAGE_LABEL = 'work image'

async function revalidateExhibition(exhibitionId: string, slug: string): Promise<void> {
  revalidateSite(await exhibitionTagsWithArtists(prisma, exhibitionId, [slug]))
}

async function exhibition(id: string) {
  const row = await prisma.exhibition.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!row) throw notFound(EXHIBITION_NOT_FOUND)
  return row
}

async function findWork(id: string) {
  const work = await prisma.exhibitionWork.findUnique({ where: { id }, include: { exhibition: { select: { slug: true } } } })
  if (!work) throw notFound(WORK_NOT_FOUND)
  return work
}

async function assertArtistInExhibition(exhibitionId: string, artistId: string): Promise<void> {
  const link = await prisma.exhibitionArtist.findUnique({ where: { exhibitionId_artistId: { exhibitionId, artistId } } })
  if (!link) {
    throw badRequest('WORK_ARTIST_NOT_IN_EXHIBITION', 'The work artist must be one of the exhibition artists')
  }
}

async function nextSortOrder(exhibitionId: string): Promise<number> {
  const last = await prisma.exhibitionWork.aggregate({ where: { exhibitionId }, _max: { sortOrder: true } })
  return (last._max.sortOrder ?? -1) + 1
}

async function list(exhibitionId: string) {
  await exhibition(exhibitionId)
  return prisma.exhibitionWork.findMany({
    where: { exhibitionId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { image: true, artist: { select: { id: true, name: true } } },
  })
}

async function create(exhibitionId: string, input: ExhibitionWorkInput) {
  const { slug } = await exhibition(exhibitionId)
  await assertMediaExists(prisma, input.imageId, WORK_IMAGE_LABEL)
  await assertArtistInExhibition(exhibitionId, input.artistId)
  const created = await prisma.exhibitionWork.create({
    data: { ...input, exhibitionId, sortOrder: await nextSortOrder(exhibitionId) },
  })
  await revalidateExhibition(exhibitionId, slug)
  return created
}

async function importFromArtwork(exhibitionId: string, artworkId: string) {
  const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } })
  if (!artwork) throw notFound(ARTWORK_NOT_FOUND)
  if (!artwork.imageId) throw badRequest('ARTWORK_HAS_NO_IMAGE', 'Artwork has no image to import')
  const { slug } = await exhibition(exhibitionId)
  await assertArtistInExhibition(exhibitionId, artwork.artistId)
  const created = await prisma.exhibitionWork.create({
    data: {
      exhibitionId,
      imageId: artwork.imageId,
      title: artwork.title,
      year: artwork.year,
      medium: artwork.medium,
      artistId: artwork.artistId,
      artworkId: artwork.id,
      sortOrder: await nextSortOrder(exhibitionId),
    },
  })
  await revalidateExhibition(exhibitionId, slug)
  return created
}

async function update(workId: string, input: ExhibitionWorkInput) {
  const work = await findWork(workId)
  await assertMediaExists(prisma, input.imageId, WORK_IMAGE_LABEL)
  await assertArtistInExhibition(work.exhibitionId, input.artistId)
  const updated = await prisma.exhibitionWork.update({ where: { id: workId }, data: input })
  await revalidateExhibition(work.exhibitionId, work.exhibition.slug)
  return updated
}

async function remove(workId: string) {
  const work = await findWork(workId)
  await prisma.exhibitionWork.delete({ where: { id: workId } })
  await revalidateExhibition(work.exhibitionId, work.exhibition.slug)
  return { id: workId }
}

async function reorder(exhibitionId: string, ids: string[]) {
  const { slug } = await exhibition(exhibitionId)
  const current = await prisma.exhibitionWork.findMany({ where: { exhibitionId }, select: { id: true } })
  assertExactOrder(ids, current.map((r) => r.id), 'work of this exhibition')
  await prisma.$transaction(ids.map((id, sortOrder) => prisma.exhibitionWork.update({ where: { id }, data: { sortOrder } })))
  await revalidateExhibition(exhibitionId, slug)
  return list(exhibitionId)
}

export const exhibitionWorksService = { list, create, importFromArtwork, update, remove, reorder }
