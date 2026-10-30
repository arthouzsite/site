import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { tagsFor, type ArtworkInput } from '@arthouz/shared'
import { PrismaService } from '../common/prisma.service'
import { RevalidateService } from '../revalidate/revalidate.service'
import { ARTWORK_INCLUDE, toAdminArtwork } from './artworks.mapper'
import { assertMediaExists } from '../common/media-exists'
import { assertExactOrder } from '../common/exact-order'

const ARTIST_NOT_FOUND = 'Artist not found'
const ARTWORK_NOT_FOUND = 'Artwork not found'

export type ArtworkBody = Omit<ArtworkInput, 'artistId'>

// Placement (sortOrder), owner (artistId) and publish state are not set via the body.
function writableData(input: ArtworkBody) {
  const { sortOrder: _s, isPublished: _p, ...rest } = input
  return rest
}

@Injectable()
export class ArtworksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async list(artistId: string) {
    await this.artist(artistId)
    const rows = await this.prisma.artwork.findMany({
      where: { artistId },
      include: ARTWORK_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toAdminArtwork)
  }

  async create(artistId: string, input: ArtworkBody) {
    const { slug } = await this.artist(artistId)
    await assertMediaExists(this.prisma, input.imageId, 'image')
    const last = await this.prisma.artwork.aggregate({ where: { artistId }, _max: { sortOrder: true } })
    const created = await this.prisma.artwork.create({
      data: { ...writableData(input), artistId, isPublished: input.isPublished, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      include: ARTWORK_INCLUDE,
    })
    this.revalidate.trigger(tagsFor('artwork', slug))
    return toAdminArtwork(created)
  }

  async update(id: string, input: ArtworkBody) {
    const existing = await this.find(id)
    await assertMediaExists(this.prisma, input.imageId, 'image')
    const updated = await this.prisma.artwork.update({ where: { id }, data: writableData(input), include: ARTWORK_INCLUDE })
    this.revalidate.trigger(tagsFor('artwork', existing.artist.slug))
    return toAdminArtwork(updated)
  }

  async publish(id: string, isPublished: boolean) {
    const existing = await this.find(id)
    const updated = await this.prisma.artwork.update({ where: { id }, data: { isPublished }, include: ARTWORK_INCLUDE })
    this.revalidate.trigger(tagsFor('artwork', existing.artist.slug))
    return toAdminArtwork(updated)
  }

  async reorder(artistId: string, ids: string[]) {
    const { slug } = await this.artist(artistId)
    const current = await this.prisma.artwork.findMany({ where: { artistId }, select: { id: true } })
    assertExactOrder(ids, current.map((r) => r.id), 'artwork of this artist')
    await this.prisma.$transaction(ids.map((id, sortOrder) => this.prisma.artwork.update({ where: { id }, data: { sortOrder } })))
    this.revalidate.trigger(tagsFor('artwork', slug))
    return this.list(artistId)
  }

  async remove(id: string) {
    const existing = await this.find(id)
    const workCount = await this.prisma.exhibitionWork.count({ where: { artworkId: id } })
    if (workCount > 0) {
      throw new ConflictException({
        code: 'ARTWORK_IN_USE',
        message: 'Artwork is used by exhibition works',
        details: { workCount },
      })
    }
    await this.prisma.artwork.delete({ where: { id } })
    this.revalidate.trigger(tagsFor('artwork', existing.artist.slug))
    return { id }
  }

  private async artist(id: string) {
    const row = await this.prisma.artist.findUnique({ where: { id }, select: { id: true, slug: true } })
    if (!row) throw new NotFoundException(ARTIST_NOT_FOUND)
    return row
  }

  private async find(id: string) {
    const row = await this.prisma.artwork.findUnique({ where: { id }, include: { ...ARTWORK_INCLUDE, artist: { select: { slug: true } } } })
    if (!row) throw new NotFoundException(ARTWORK_NOT_FOUND)
    return row
  }
}
