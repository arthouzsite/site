import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { z } from 'zod'
import { EXHIBITION_STATUSES, slugify, type ExhibitionInput, type ExhibitionStatus } from '@arthouz/shared'
import { withMeta } from '../common/envelope.interceptor'
import { parsePagination } from '../common/pagination'
import { PrismaService } from '../common/prisma.service'
import { uniqueSlug } from '../common/slugs'
import { today } from '../config/clock'
import type { Prisma } from '../generated/prisma/client'
import { exhibitionTagsWithArtists, linkedArtistSlugs } from '../revalidate/related-tags'
import { RevalidateService } from '../revalidate/revalidate.service'
import { EXHIBITION_INCLUDE, toAdminExhibition } from './exhibitions.mapper'
import { assertMediaExists } from '../common/media-exists'

const STATUS_QUERY_VALUES = EXHIBITION_STATUSES.map((s) => s.toLowerCase()) as [string, ...string[]]
const MAX_CITY_LENGTH = 80
const MAX_SEARCH_LENGTH = 120

export const exhibitionListQuerySchema = z.object({
  status: z
    .enum(STATUS_QUERY_VALUES)
    .transform((v) => v.toUpperCase() as ExhibitionStatus)
    .optional(),
  city: z.string().trim().max(MAX_CITY_LENGTH).optional(),
  q: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  published: z.enum(['true', 'false']).optional(),
  artistId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
})

export type ExhibitionListQuery = z.infer<typeof exhibitionListQuerySchema>

const NOT_FOUND = 'Exhibition not found'
const UNKNOWN_ARTIST = 'UNKNOWN_ARTIST'

// Status is computed from dates unless overridden, so it is filtered in SQL using the same rule
// as resolveExhibitionStatus: an explicit override wins, otherwise compare dates with today().
function statusWhere(status: ExhibitionStatus): Prisma.ExhibitionWhereInput {
  const now = today()
  const derived: Record<ExhibitionStatus, Prisma.ExhibitionWhereInput> = {
    UPCOMING: { startDate: { gt: now } },
    PAST: { endDate: { lt: now } },
    CURRENT: { startDate: { lte: now }, endDate: { gte: now } },
  }
  return { OR: [{ statusOverride: status }, { statusOverride: null, ...derived[status] }] }
}

function listWhere(query: ExhibitionListQuery): Prisma.ExhibitionWhereInput {
  const and: Prisma.ExhibitionWhereInput[] = []
  if (query.status) and.push(statusWhere(query.status))
  if (query.city) and.push({ city: { equals: query.city, mode: 'insensitive' } })
  if (query.published === 'true' || query.published === 'false') and.push({ isPublished: query.published === 'true' })
  if (query.artistId) and.push({ artists: { some: { artistId: query.artistId } } })
  if (query.q) {
    and.push({ OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { subtitle: { contains: query.q, mode: 'insensitive' } }] })
  }
  return { AND: and }
}

// Scalars written on create; artists have their own join handling.
function createData(input: ExhibitionInput, slug: string) {
  const { artistIds: _artistIds, slug: _slug, ...rest } = input
  return { ...rest, slug }
}

// PATCH never touches publish state (own endpoints) or artists (setArtists).
function updateData(input: ExhibitionInput, slug: string) {
  const { isPublished: _isPublished, ...rest } = createData(input, slug)
  return rest
}

@Injectable()
export class ExhibitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async list(query: ExhibitionListQuery) {
    const { page, limit, skip } = parsePagination(query)
    const where = listWhere(query)
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.exhibition.findMany({ where, include: EXHIBITION_INCLUDE, orderBy: [{ startDate: 'desc' }, { id: 'asc' }], skip, take: limit }),
      this.prisma.exhibition.count({ where }),
    ])
    return withMeta(rows.map(toAdminExhibition), { page, limit, total })
  }

  async get(id: string) {
    return toAdminExhibition(await this.find(id))
  }

  async create(input: ExhibitionInput, _userId: string) {
    const artistIds = await this.validArtistIds(input.artistIds)
    await assertMediaExists(this.prisma, input.heroImageId, 'hero image')
    const slug = await uniqueSlug(this.prisma, 'exhibition', input.slug ?? input.title)
    const created = await this.prisma.exhibition.create({
      data: {
        ...createData(input, slug),
        artists: { create: artistIds.map((artistId, sortOrder) => ({ artistId, sortOrder })) },
      },
      include: EXHIBITION_INCLUDE,
    })
    this.revalidate.trigger(await exhibitionTagsWithArtists(this.prisma, created.id, [created.slug]))
    return toAdminExhibition(created)
  }

  async update(id: string, input: ExhibitionInput) {
    const existing = await this.find(id)
    await assertMediaExists(this.prisma, input.heroImageId, 'hero image')
    const wantsNewSlug = input.slug !== undefined && slugify(input.slug) !== existing.slug
    const slug = wantsNewSlug ? await uniqueSlug(this.prisma, 'exhibition', input.slug ?? '', id) : existing.slug
    const updated = await this.prisma.exhibition.update({
      where: { id },
      data: updateData(input, slug),
      include: EXHIBITION_INCLUDE,
    })
    this.revalidate.trigger(await exhibitionTagsWithArtists(this.prisma, id, [existing.slug, updated.slug]))
    return toAdminExhibition(updated)
  }

  async setArtists(id: string, requestedIds: string[]) {
    const existing = await this.find(id)
    const artistIds = await this.validArtistIds(requestedIds)
    const previousArtistSlugs = await linkedArtistSlugs(this.prisma, id)
    await this.assertNoWorksForRemoved(id, artistIds)
    await this.prisma.$transaction([
      this.prisma.exhibitionArtist.deleteMany({ where: { exhibitionId: id } }),
      this.prisma.exhibitionArtist.createMany({
        data: artistIds.map((artistId, sortOrder) => ({ exhibitionId: id, artistId, sortOrder })),
      }),
    ])
    this.revalidate.trigger(await exhibitionTagsWithArtists(this.prisma, id, [existing.slug], previousArtistSlugs))
    return this.get(id)
  }

  async publish(id: string, isPublished: boolean) {
    const existing = await this.find(id)
    const updated = await this.prisma.exhibition.update({ where: { id }, data: { isPublished }, include: EXHIBITION_INCLUDE })
    this.revalidate.trigger(await exhibitionTagsWithArtists(this.prisma, id, [existing.slug]))
    return toAdminExhibition(updated)
  }

  async bulkPublish(requestedIds: string[], isPublished: boolean) {
    const ids = Array.from(new Set(requestedIds))
    const { rows, count } = await this.prisma.$transaction(async (tx) => {
      const found = await tx.exhibition.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } })
      if (found.length !== ids.length) {
        const known = new Set(found.map((r) => r.id))
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: NOT_FOUND,
          details: { missingIds: ids.filter((i) => !known.has(i)) },
        })
      }
      const result = await tx.exhibition.updateMany({ where: { id: { in: ids } }, data: { isPublished } })
      return { rows: found, count: result.count }
    })
    const tags = await Promise.all(rows.map((r) => exhibitionTagsWithArtists(this.prisma, r.id, [r.slug])))
    this.revalidate.trigger(tags.flat())
    return { updated: count }
  }

  async remove(id: string) {
    const existing = await this.find(id)
    const tags = await exhibitionTagsWithArtists(this.prisma, id, [existing.slug])
    await this.prisma.exhibition.delete({ where: { id } })
    this.revalidate.trigger(tags)
    return { id }
  }

  // Works reference an artist of the exhibition (WORK_ARTIST_NOT_IN_EXHIBITION), so dropping that artist would orphan them.
  private async assertNoWorksForRemoved(exhibitionId: string, keptArtistIds: string[]): Promise<void> {
    const blocking = await this.prisma.exhibitionWork.findMany({
      where: { exhibitionId, artistId: { notIn: keptArtistIds } },
      select: { artistId: true },
      distinct: ['artistId'],
    })
    if (blocking.length === 0) return
    const artistIds = blocking.map((w) => w.artistId)
    throw new ConflictException({
      code: 'ARTIST_HAS_WORKS',
      message: 'Remove or reassign this exhibition\'s works by these artists first',
      details: { artistIds },
    })
  }

  private async validArtistIds(requested: string[]): Promise<string[]> {
    const ids = Array.from(new Set(requested))
    const found = await this.prisma.artist.findMany({ where: { id: { in: ids } }, select: { id: true } })
    const known = new Set(found.map((a) => a.id))
    const missing = ids.filter((i) => !known.has(i))
    if (missing.length > 0) {
      throw new BadRequestException({ code: UNKNOWN_ARTIST, message: `Unknown artist ids: ${missing.join(', ')}`, details: { missingIds: missing } })
    }
    return ids
  }

  private async find(id: string) {
    const row = await this.prisma.exhibition.findUnique({ where: { id }, include: EXHIBITION_INCLUDE })
    if (!row) throw new NotFoundException(NOT_FOUND)
    return row
  }
}
