import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { tagsFor, type ExhibitionWorkInput } from '@arthouz/shared'
import { PrismaService } from '../common/prisma.service'
import { RevalidateService } from '../revalidate/revalidate.service'

const WORK_NOT_FOUND = 'Work not found'
const EXHIBITION_NOT_FOUND = 'Exhibition not found'
const ARTWORK_NOT_FOUND = 'Artwork not found'

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
    await this.assertArtistInExhibition(exhibitionId, input.artistId)
    const last = await this.prisma.exhibitionWork.aggregate({ where: { exhibitionId }, _max: { sortOrder: true } })
    const created = await this.prisma.exhibitionWork.create({
      data: { ...input, exhibitionId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    })
    this.revalidate.trigger(tagsFor('exhibition', slug))
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
    this.revalidate.trigger(tagsFor('exhibition', slug))
    return created
  }

  async update(workId: string, input: ExhibitionWorkInput) {
    const work = await this.findWork(workId)
    await this.assertArtistInExhibition(work.exhibitionId, input.artistId)
    const updated = await this.prisma.exhibitionWork.update({ where: { id: workId }, data: input })
    this.revalidate.trigger(tagsFor('exhibition', work.exhibition.slug))
    return updated
  }

  async remove(workId: string) {
    const work = await this.findWork(workId)
    await this.prisma.exhibitionWork.delete({ where: { id: workId } })
    this.revalidate.trigger(tagsFor('exhibition', work.exhibition.slug))
    return { id: workId }
  }

  async reorder(exhibitionId: string, ids: string[]) {
    const { slug } = await this.exhibition(exhibitionId)
    const current = await this.prisma.exhibitionWork.findMany({ where: { exhibitionId }, select: { id: true } })
    const expected = new Set(current.map((w) => w.id))
    const isExactSet = ids.length === expected.size && new Set(ids).size === ids.length && ids.every((id) => expected.has(id))
    if (!isExactSet) {
      throw new BadRequestException({ code: 'INVALID_ORDER', message: 'ids must list every work of this exhibition exactly once' })
    }
    await this.prisma.$transaction(
      ids.map((id, sortOrder) => this.prisma.exhibitionWork.update({ where: { id }, data: { sortOrder } })),
    )
    this.revalidate.trigger(tagsFor('exhibition', slug))
    return this.list(exhibitionId)
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
