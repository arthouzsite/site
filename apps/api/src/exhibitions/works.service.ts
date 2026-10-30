import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { ExhibitionWorkInput } from '@arthouz/shared'
import { PrismaService } from '../common/prisma.service'
import { assertMediaExists } from '../common/media-exists'
import { exhibitionTagsWithArtists } from '../revalidate/related-tags'
import { RevalidateService } from '../revalidate/revalidate.service'
import { assertExactOrder } from '../common/exact-order'

const WORK_NOT_FOUND = 'Work not found'
const EXHIBITION_NOT_FOUND = 'Exhibition not found'
const ARTWORK_NOT_FOUND = 'Artwork not found'
const WORK_IMAGE_LABEL = 'work image'

@Injectable()
export class ExhibitionWorksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async list(exhibitionId: string) {
    await this.exhibition(exhibitionId)
    return this.prisma.exhibitionWork.findMany({
      where: { exhibitionId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { image: true, artist: { select: { id: true, name: true } } },
    })
  }

  async create(exhibitionId: string, input: ExhibitionWorkInput) {
    const { slug } = await this.exhibition(exhibitionId)
    await assertMediaExists(this.prisma, input.imageId, WORK_IMAGE_LABEL)
    await this.assertArtistInExhibition(exhibitionId, input.artistId)
    const last = await this.prisma.exhibitionWork.aggregate({ where: { exhibitionId }, _max: { sortOrder: true } })
    const created = await this.prisma.exhibitionWork.create({
      data: { ...input, exhibitionId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    })
    await this.revalidateExhibition(exhibitionId, slug)
    return created
  }

  async importFromArtwork(exhibitionId: string, artworkId: string) {
    const artwork = await this.prisma.artwork.findUnique({ where: { id: artworkId } })
    if (!artwork) throw new NotFoundException(ARTWORK_NOT_FOUND)
    if (!artwork.imageId) {
      throw new BadRequestException({ code: 'ARTWORK_HAS_NO_IMAGE', message: 'Artwork has no image to import' })
    }
    const { slug } = await this.exhibition(exhibitionId)
    await this.assertArtistInExhibition(exhibitionId, artwork.artistId)
    const last = await this.prisma.exhibitionWork.aggregate({ where: { exhibitionId }, _max: { sortOrder: true } })
    const created = await this.prisma.exhibitionWork.create({
      data: {
        exhibitionId,
        imageId: artwork.imageId,
        title: artwork.title,
        year: artwork.year,
        medium: artwork.medium,
        artistId: artwork.artistId,
        artworkId: artwork.id,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    })
    await this.revalidateExhibition(exhibitionId, slug)
    return created
  }

  async update(workId: string, input: ExhibitionWorkInput) {
    const work = await this.findWork(workId)
    await assertMediaExists(this.prisma, input.imageId, WORK_IMAGE_LABEL)
    await this.assertArtistInExhibition(work.exhibitionId, input.artistId)
    const updated = await this.prisma.exhibitionWork.update({ where: { id: workId }, data: input })
    await this.revalidateExhibition(work.exhibitionId, work.exhibition.slug)
    return updated
  }

  async remove(workId: string) {
    const work = await this.findWork(workId)
    await this.prisma.exhibitionWork.delete({ where: { id: workId } })
    await this.revalidateExhibition(work.exhibitionId, work.exhibition.slug)
    return { id: workId }
  }

  async reorder(exhibitionId: string, ids: string[]) {
    const { slug } = await this.exhibition(exhibitionId)
    const current = await this.prisma.exhibitionWork.findMany({ where: { exhibitionId }, select: { id: true } })
    assertExactOrder(ids, current.map((r) => r.id), 'work of this exhibition')
    await this.prisma.$transaction(
      ids.map((id, sortOrder) => this.prisma.exhibitionWork.update({ where: { id }, data: { sortOrder } })),
    )
    await this.revalidateExhibition(exhibitionId, slug)
    return this.list(exhibitionId)
  }

  private async revalidateExhibition(exhibitionId: string, slug: string): Promise<void> {
    this.revalidate.trigger(await exhibitionTagsWithArtists(this.prisma, exhibitionId, [slug]))
  }

  private async exhibition(id: string) {
    const row = await this.prisma.exhibition.findUnique({ where: { id }, select: { id: true, slug: true } })
    if (!row) throw new NotFoundException(EXHIBITION_NOT_FOUND)
    return row
  }

  private async findWork(id: string) {
    const work = await this.prisma.exhibitionWork.findUnique({ where: { id }, include: { exhibition: { select: { slug: true } } } })
    if (!work) throw new NotFoundException(WORK_NOT_FOUND)
    return work
  }

  private async assertArtistInExhibition(exhibitionId: string, artistId: string): Promise<void> {
    const link = await this.prisma.exhibitionArtist.findUnique({ where: { exhibitionId_artistId: { exhibitionId, artistId } } })
    if (!link) {
      throw new BadRequestException({
        code: 'WORK_ARTIST_NOT_IN_EXHIBITION',
        message: 'The work artist must be one of the exhibition artists',
      })
    }
  }
}
