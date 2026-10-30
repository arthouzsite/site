import { Injectable, NotFoundException } from '@nestjs/common'
import { slugify, tagsFor, type LocationInput } from '@arthouz/shared'
import { withMeta } from '../common/envelope.interceptor'
import { assertExactOrder } from '../common/exact-order'
import { assertMediaExists } from '../common/media-exists'
import { PrismaService } from '../common/prisma.service'
import { uniqueSlug } from '../common/slugs'
import { RevalidateService } from '../revalidate/revalidate.service'
import { LOCATION_INCLUDE, toAdminLocation } from './locations.mapper'

const NOT_FOUND = 'Location not found'
const FIRST_SORT_ORDER = 0

// Scalars written by create/update. sortOrder has its own endpoint.
function writableFields(input: LocationInput, slug: string) {
  const { slug: _slug, sortOrder: _sortOrder, ...rest } = input
  return { ...rest, slug }
}

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async list() {
    const rows = await this.prisma.location.findMany({ include: LOCATION_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
    return withMeta(rows.map(toAdminLocation), { page: 1, limit: Math.max(rows.length, 1), total: rows.length })
  }

  async get(id: string) {
    return toAdminLocation(await this.find(id))
  }

  async create(input: LocationInput) {
    await assertMediaExists(this.prisma, input.imageId)
    const slug = await uniqueSlug(this.prisma, 'location', input.slug ?? input.city)
    const last = await this.prisma.location.aggregate({ _max: { sortOrder: true } })
    const created = await this.prisma.location.create({
      data: { ...writableFields(input, slug), sortOrder: (last._max.sortOrder ?? FIRST_SORT_ORDER - 1) + 1 },
      include: LOCATION_INCLUDE,
    })
    this.revalidate.trigger(tagsFor('location', created.slug))
    return toAdminLocation(created)
  }

  async update(id: string, input: LocationInput) {
    const existing = await this.find(id)
    await assertMediaExists(this.prisma, input.imageId)
    const slug = await this.nextSlug(existing, input, id)
    const updated = await this.prisma.location.update({ where: { id }, data: writableFields(input, slug), include: LOCATION_INCLUDE })
    this.revalidate.trigger([...tagsFor('location', existing.slug), ...tagsFor('location', updated.slug)])
    return toAdminLocation(updated)
  }

  async reorder(ids: string[]) {
    const current = await this.prisma.location.findMany({ select: { id: true, slug: true } })
    assertExactOrder(ids, current.map((l) => l.id), 'location')
    await this.prisma.$transaction(ids.map((id, sortOrder) => this.prisma.location.update({ where: { id }, data: { sortOrder } })))
    this.revalidate.trigger(current.flatMap((l) => tagsFor('location', l.slug)))
    return this.list()
  }

  async remove(id: string) {
    const existing = await this.find(id)
    await this.prisma.location.delete({ where: { id } })
    this.revalidate.trigger(tagsFor('location', existing.slug))
    return { id }
  }

  // A supplied slug or a changed city re-derives the slug; otherwise it is kept.
  private async nextSlug(existing: { slug: string; city: string }, input: LocationInput, id: string): Promise<string> {
    const base = input.slug ?? (input.city !== existing.city ? input.city : undefined)
    if (base === undefined || slugify(base) === existing.slug) return existing.slug
    return uniqueSlug(this.prisma, 'location', base, id)
  }

  private async find(id: string) {
    const row = await this.prisma.location.findUnique({ where: { id }, include: LOCATION_INCLUDE })
    if (!row) throw new NotFoundException(NOT_FOUND)
    return row
  }
}
