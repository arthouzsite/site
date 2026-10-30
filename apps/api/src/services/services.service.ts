import { Injectable, NotFoundException } from '@nestjs/common'
import { z } from 'zod'
import { slugify, tagsFor, type ServiceInput, type ServicePatch } from '@arthouz/shared'
import { withMeta } from '../common/envelope.interceptor'
import { assertExactOrder } from '../common/exact-order'
import { assertMediaExists } from '../common/media-exists'
import { MAX_LIMIT, parsePagination } from '../common/pagination'
import { PrismaService } from '../common/prisma.service'
import { uniqueSlug } from '../common/slugs'
import type { Prisma } from '../generated/prisma/client'
import { RevalidateService } from '../revalidate/revalidate.service'
import { SERVICE_INCLUDE, toAdminService } from './services.mapper'

const MAX_SEARCH_LENGTH = 120
const NOT_FOUND = 'Service not found'
const FIRST_SORT_ORDER = 0
const MEDIA_LABEL = 'Service image'
const BY_ORDER = [{ sortOrder: 'asc' }, { id: 'asc' }] satisfies Prisma.ServiceOrderByWithRelationInput[]

export const serviceListQuerySchema = z.object({
  q: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
})

export type ServiceListQuery = z.infer<typeof serviceListQuerySchema>

function listWhere(query: ServiceListQuery): Prisma.ServiceWhereInput {
  if (!query.q) return {}
  return { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { summary: { contains: query.q, mode: 'insensitive' } }] }
}

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async list(query: ServiceListQuery = {}) {
    const { page, limit, skip } = parsePagination(query)
    const where = listWhere(query)
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({ where, include: SERVICE_INCLUDE, orderBy: BY_ORDER, skip, take: limit }),
      this.prisma.service.count({ where }),
    ])
    return withMeta(rows.map(toAdminService), { page, limit, total })
  }

  async get(id: string) {
    return toAdminService(await this.find(id))
  }

  async create(input: ServiceInput) {
    await assertMediaExists(this.prisma, input.imageId, MEDIA_LABEL)
    const { slug: requested, ...rest } = input
    const slug = await uniqueSlug(this.prisma, 'service', requested ?? input.title)
    const last = await this.prisma.service.aggregate({ _max: { sortOrder: true } })
    const created = await this.prisma.service.create({
      data: { ...rest, slug, sortOrder: (last._max.sortOrder ?? FIRST_SORT_ORDER - 1) + 1 },
      include: SERVICE_INCLUDE,
    })
    this.revalidate.trigger(tagsFor('service', created.slug))
    return toAdminService(created)
  }

  async update(id: string, patch: ServicePatch) {
    const existing = await this.find(id)
    await assertMediaExists(this.prisma, patch.imageId, MEDIA_LABEL)
    const slug = await this.nextSlug(existing, patch, id)
    const { slug: _slug, ...rest } = patch
    const updated = await this.prisma.service.update({ where: { id }, data: { ...rest, slug }, include: SERVICE_INCLUDE })
    this.revalidate.trigger([...tagsFor('service', existing.slug), ...tagsFor('service', updated.slug)])
    return toAdminService(updated)
  }

  async publish(id: string, isPublished: boolean) {
    const existing = await this.find(id)
    const updated = await this.prisma.service.update({ where: { id }, data: { isPublished }, include: SERVICE_INCLUDE })
    this.revalidate.trigger(tagsFor('service', existing.slug))
    return toAdminService(updated)
  }

  async reorder(ids: string[]) {
    const current = await this.prisma.service.findMany({ select: { id: true, slug: true } })
    assertExactOrder(ids, current.map((s) => s.id), 'service')
    await this.prisma.$transaction(ids.map((id, sortOrder) => this.prisma.service.update({ where: { id }, data: { sortOrder } })))
    this.revalidate.trigger(current.flatMap((s) => tagsFor('service', s.slug)))
    return this.list({ limit: MAX_LIMIT })
  }

  async remove(id: string) {
    const existing = await this.find(id)
    await this.prisma.service.delete({ where: { id } })
    this.revalidate.trigger(tagsFor('service', existing.slug))
    return { id }
  }

  // A supplied slug or a changed title re-derives the slug; otherwise it is kept.
  private async nextSlug(existing: { slug: string; title: string }, patch: ServicePatch, id: string): Promise<string> {
    const base = patch.slug ?? (patch.title !== undefined && patch.title !== existing.title ? patch.title : undefined)
    if (base === undefined || slugify(base) === existing.slug) return existing.slug
    return uniqueSlug(this.prisma, 'service', base, id)
  }

  private async find(id: string) {
    const row = await this.prisma.service.findUnique({ where: { id }, include: SERVICE_INCLUDE })
    if (!row) throw new NotFoundException(NOT_FOUND)
    return row
  }
}
