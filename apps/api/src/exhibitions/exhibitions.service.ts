import { Injectable, NotFoundException } from '@nestjs/common'
import { slugify, tagsFor, type ExhibitionInput, type ExhibitionStatus } from '@arthouz/shared'
import { withMeta } from '../common/envelope.interceptor'
import { parsePagination } from '../common/pagination'
import { PrismaService } from '../common/prisma.service'
import { uniqueSlug } from '../common/slugs'
import { today } from '../config/clock'
import type { Prisma } from '../generated/prisma/client'
import { RevalidateService } from '../revalidate/revalidate.service'
import { EXHIBITION_INCLUDE, toAdminExhibition } from './exhibitions.mapper'

export type ExhibitionListQuery = {
  status?: ExhibitionStatus
  city?: string
  published?: string
  q?: string
  page?: unknown
  limit?: unknown
}

const NOT_FOUND = 'Exhibition not found'

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
  if (query.q) {
    and.push({ OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { subtitle: { contains: query.q, mode: 'insensitive' } }] })
  }
  return { AND: and }
}

function scalarData(input: ExhibitionInput, slug: string) {
  const { artistIds: _artistIds, slug: _slug, ...rest } = input
  return { ...rest, slug }
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
    const slug = await uniqueSlug(this.prisma, 'exhibition', input.slug ?? input.title)
    const created = await this.prisma.exhibition.create({
      data: {
        ...scalarData(input, slug),
        artists: { create: input.artistIds.map((artistId, sortOrder) => ({ artistId, sortOrder })) },
      },
      include: EXHIBITION_INCLUDE,
    })
    this.revalidate.trigger(tagsFor('exhibition', created.slug))
    return toAdminExhibition(created)
  }

  async update(id: string, input: ExhibitionInput) {
    const existing = await this.find(id)
    const wantsNewSlug = input.slug !== undefined && slugify(input.slug) !== existing.slug
    const slug = wantsNewSlug ? await uniqueSlug(this.prisma, 'exhibition', input.slug ?? '', id) : existing.slug
    const updated = await this.prisma.exhibition.update({
      where: { id },
      data: scalarData(input, slug),
      include: EXHIBITION_INCLUDE,
    })
    this.revalidate.trigger([...tagsFor('exhibition', existing.slug), ...tagsFor('exhibition', updated.slug)])
    return toAdminExhibition(updated)
  }

  async setArtists(id: string, artistIds: string[]) {
    const existing = await this.find(id)
    await this.prisma.$transaction([
      this.prisma.exhibitionArtist.deleteMany({ where: { exhibitionId: id } }),
      this.prisma.exhibitionArtist.createMany({
        data: artistIds.map((artistId, sortOrder) => ({ exhibitionId: id, artistId, sortOrder })),
      }),
    ])
    this.revalidate.trigger(tagsFor('exhibition', existing.slug))
    return this.get(id)
  }

  async publish(id: string, isPublished: boolean) {
    const existing = await this.find(id)
    const updated = await this.prisma.exhibition.update({ where: { id }, data: { isPublished }, include: EXHIBITION_INCLUDE })
    this.revalidate.trigger(tagsFor('exhibition', existing.slug))
    return toAdminExhibition(updated)
  }

  async bulkPublish(ids: string[], isPublished: boolean) {
    const rows = await this.prisma.exhibition.findMany({ where: { id: { in: ids } }, select: { slug: true } })
    const { count } = await this.prisma.exhibition.updateMany({ where: { id: { in: ids } }, data: { isPublished } })
    this.revalidate.trigger(rows.flatMap((r) => tagsFor('exhibition', r.slug)))
    return { updated: count }
  }

  async remove(id: string) {
    const existing = await this.find(id)
    await this.prisma.exhibition.delete({ where: { id } })
    this.revalidate.trigger(tagsFor('exhibition', existing.slug))
    return { id }
  }

  private async find(id: string) {
    const row = await this.prisma.exhibition.findUnique({ where: { id }, include: EXHIBITION_INCLUDE })
    if (!row) throw new NotFoundException(NOT_FOUND)
    return row
  }
}
