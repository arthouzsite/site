import { Injectable, NotFoundException } from '@nestjs/common'
import { slugify, tagsFor, type FairInput } from '@arthouz/shared'
import { withMeta } from '../common/envelope.interceptor'
import { assertExactOrder } from '../common/exact-order'
import { assertMediaExists } from '../common/media-exists'
import { PrismaService } from '../common/prisma.service'
import { uniqueSlug } from '../common/slugs'
import { RevalidateService } from '../revalidate/revalidate.service'
import { FAIR_INCLUDE, toAdminFair } from './fairs.mapper'

const NOT_FOUND = 'Fair not found'
const FIRST_SORT_ORDER = 0

// Scalars written by create/update. sortOrder and isPublished have their own endpoints.
function writableFields(input: FairInput, slug: string) {
  const { slug: _slug, sortOrder: _sortOrder, isPublished: _isPublished, ...rest } = input
  return { ...rest, slug }
}

@Injectable()
export class FairsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async list() {
    const rows = await this.prisma.fair.findMany({ include: FAIR_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
    return withMeta(rows.map(toAdminFair), { page: 1, limit: Math.max(rows.length, 1), total: rows.length })
  }

  async get(id: string) {
    return toAdminFair(await this.find(id))
  }

  async create(input: FairInput) {
    await assertMediaExists(this.prisma, input.imageId)
    const slug = await uniqueSlug(this.prisma, 'fair', input.slug ?? input.title)
    const last = await this.prisma.fair.aggregate({ _max: { sortOrder: true } })
    const created = await this.prisma.fair.create({
      data: { ...writableFields(input, slug), isPublished: input.isPublished, sortOrder: (last._max.sortOrder ?? FIRST_SORT_ORDER - 1) + 1 },
      include: FAIR_INCLUDE,
    })
    this.revalidate.trigger(tagsFor('fair', created.slug))
    return toAdminFair(created)
  }

  async update(id: string, input: FairInput) {
    const existing = await this.find(id)
    await assertMediaExists(this.prisma, input.imageId)
    const slug = await this.nextSlug(existing, input, id)
    const updated = await this.prisma.fair.update({ where: { id }, data: writableFields(input, slug), include: FAIR_INCLUDE })
    this.revalidate.trigger([...tagsFor('fair', existing.slug), ...tagsFor('fair', updated.slug)])
    return toAdminFair(updated)
  }

  async publish(id: string, isPublished: boolean) {
    const existing = await this.find(id)
    const updated = await this.prisma.fair.update({ where: { id }, data: { isPublished }, include: FAIR_INCLUDE })
    this.revalidate.trigger(tagsFor('fair', existing.slug))
    return toAdminFair(updated)
  }

  async reorder(ids: string[]) {
    const current = await this.prisma.fair.findMany({ select: { id: true, slug: true } })
    assertExactOrder(ids, current.map((f) => f.id), 'fair')
    await this.prisma.$transaction(ids.map((id, sortOrder) => this.prisma.fair.update({ where: { id }, data: { sortOrder } })))
    this.revalidate.trigger(current.flatMap((f) => tagsFor('fair', f.slug)))
    return this.list()
  }

  async remove(id: string) {
    const existing = await this.find(id)
    await this.prisma.fair.delete({ where: { id } })
    this.revalidate.trigger(tagsFor('fair', existing.slug))
    return { id }
  }

  // A supplied slug or a changed title re-derives the slug; otherwise it is kept.
  private async nextSlug(existing: { slug: string; title: string }, input: FairInput, id: string): Promise<string> {
    const base = input.slug ?? (input.title !== existing.title ? input.title : undefined)
    if (base === undefined || slugify(base) === existing.slug) return existing.slug
    return uniqueSlug(this.prisma, 'fair', base, id)
  }

  private async find(id: string) {
    const row = await this.prisma.fair.findUnique({ where: { id }, include: FAIR_INCLUDE })
    if (!row) throw new NotFoundException(NOT_FOUND)
    return row
  }
}
