import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { slugify, tagsFor, type ArtistInput } from '@arthouz/shared'
import { withMeta } from '../common/envelope.interceptor'
import { parsePagination } from '../common/pagination'
import { PrismaService } from '../common/prisma.service'
import { uniqueSlug } from '../common/slugs'
import { RevalidateService } from '../revalidate/revalidate.service'
import { ARTIST_INCLUDE, toAdminArtist } from './artists.mapper'
import { artistListWhere, type ArtistListQuery } from './artists.query'

const NOT_FOUND = 'Artist not found'
const UNKNOWN_ARTIST = 'UNKNOWN_ARTIST'
const UNKNOWN_MEDIA = 'UNKNOWN_MEDIA'
const NOT_FEATURED_ORDER = 0

// Scalars written by create/PATCH. Publish and feature state have their own endpoints.
function writableData(input: ArtistInput, slug: string) {
  const { slug: _slug, sortName, isPublished: _p, isFeatured: _f, featuredOrder: _o, ...rest } = input
  return { ...rest, slug, sortName: sortName?.trim() || input.name }
}

@Injectable()
export class ArtistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async list(query: ArtistListQuery) {
    const { page, limit, skip } = parsePagination(query)
    const where = artistListWhere(query)
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.artist.findMany({ where, include: ARTIST_INCLUDE, orderBy: [{ sortName: 'asc' }, { id: 'asc' }], skip, take: limit }),
      this.prisma.artist.count({ where }),
    ])
    return withMeta(rows.map(toAdminArtist), { page, limit, total })
  }

  async get(id: string) {
    return toAdminArtist(await this.find(id))
  }

  async create(input: ArtistInput) {
    await this.assertMedia(input.portraitImageId)
    const slug = await uniqueSlug(this.prisma, 'artist', input.slug ?? input.name)
    const created = await this.prisma.artist.create({
      data: { ...writableData(input, slug), isPublished: input.isPublished },
      include: ARTIST_INCLUDE,
    })
    this.revalidate.trigger(tagsFor('artist', created.slug))
    return toAdminArtist(created)
  }

  async update(id: string, input: ArtistInput) {
    const existing = await this.find(id)
    await this.assertMedia(input.portraitImageId)
    const requested = input.slug ?? (input.name !== existing.name ? input.name : undefined)
    const wantsNewSlug = requested !== undefined && slugify(requested) !== existing.slug
    const slug = wantsNewSlug ? await uniqueSlug(this.prisma, 'artist', requested, id) : existing.slug
    const updated = await this.prisma.artist.update({ where: { id }, data: writableData(input, slug), include: ARTIST_INCLUDE })
    this.revalidate.trigger([...tagsFor('artist', existing.slug), ...tagsFor('artist', updated.slug)])
    return toAdminArtist(updated)
  }

  async publish(id: string, isPublished: boolean) {
    const existing = await this.find(id)
    const updated = await this.prisma.artist.update({ where: { id }, data: { isPublished }, include: ARTIST_INCLUDE })
    this.revalidate.trigger(tagsFor('artist', existing.slug))
    return toAdminArtist(updated)
  }

  async setFeatured(id: string, isFeatured: boolean) {
    const existing = await this.find(id)
    if (existing.isFeatured === isFeatured) return toAdminArtist(existing)
    await this.prisma.$transaction(async (tx) => {
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
    this.revalidate.trigger(tagsFor('artist', existing.slug))
    return this.get(id)
  }

  async setFeaturedOrder(requestedIds: string[]) {
    const ids = Array.from(new Set(requestedIds))
    const found = await this.prisma.artist.findMany({ where: { id: { in: ids } }, select: { id: true } })
    const known = new Set(found.map((a) => a.id))
    const missing = ids.filter((i) => !known.has(i))
    if (missing.length > 0) {
      throw new BadRequestException({ code: UNKNOWN_ARTIST, message: `Unknown artist ids: ${missing.join(', ')}`, details: { missingIds: missing } })
    }
    const before = await this.prisma.artist.findMany({ where: { OR: [{ isFeatured: true }, { id: { in: ids } }] }, select: { slug: true } })
    await this.prisma.$transaction([
      this.prisma.artist.updateMany({ where: { id: { notIn: ids } }, data: { isFeatured: false, featuredOrder: NOT_FEATURED_ORDER } }),
      ...ids.map((id, index) => this.prisma.artist.update({ where: { id }, data: { isFeatured: true, featuredOrder: index + 1 } })),
    ])
    this.revalidate.trigger(before.flatMap((a) => tagsFor('artist', a.slug)))
    const rows = await this.prisma.artist.findMany({ where: { isFeatured: true }, include: ARTIST_INCLUDE, orderBy: { featuredOrder: 'asc' } })
    return rows.map(toAdminArtist)
  }

  async remove(id: string) {
    const existing = await this.find(id)
    const [links, workCount, artworkCount] = await Promise.all([
      this.prisma.exhibitionArtist.findMany({ where: { artistId: id }, include: { exhibition: { select: { id: true, title: true } } } }),
      this.prisma.exhibitionWork.count({ where: { artistId: id } }),
      this.prisma.artwork.count({ where: { artistId: id } }),
    ])
    if (links.length > 0 || workCount > 0 || artworkCount > 0) {
      throw new ConflictException({
        code: 'ARTIST_IN_USE',
        message: 'Artist is used by exhibitions or has artworks',
        details: { exhibitions: links.map((l) => ({ id: l.exhibition.id, title: l.exhibition.title })), workCount, artworkCount },
      })
    }
    await this.prisma.artist.delete({ where: { id } })
    this.revalidate.trigger(tagsFor('artist', existing.slug))
    return { id }
  }

  private async assertMedia(mediaId: string | null): Promise<void> {
    if (!mediaId) return
    const media = await this.prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } })
    if (!media) throw new BadRequestException({ code: UNKNOWN_MEDIA, message: `Unknown portrait image: ${mediaId}` })
  }

  private async find(id: string) {
    const row = await this.prisma.artist.findUnique({ where: { id }, include: ARTIST_INCLUDE })
    if (!row) throw new NotFoundException(NOT_FOUND)
    return row
  }
}
