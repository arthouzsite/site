import { z } from 'zod'
import { slugify, tagsFor, type ServiceInput, type ServicePatch } from '@/lib/shared'
import { assertExactOrder } from '@/lib/server/common/exact-order'
import { assertMediaExists } from '@/lib/server/common/media-exists'
import { MAX_LIMIT, parsePagination } from '@/lib/server/common/pagination'
import { uniqueSlug } from '@/lib/server/common/slugs'
import type { Prisma } from '@/lib/server/generated/prisma/client'
import { notFound } from '@/lib/server/http/errors'
import { withMeta } from '@/lib/server/http/route'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
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

async function find(id: string) {
  const row = await prisma.service.findUnique({ where: { id }, include: SERVICE_INCLUDE })
  if (!row) throw notFound(NOT_FOUND)
  return row
}

// A supplied slug or a changed title re-derives the slug; otherwise it is kept.
async function nextSlug(existing: { slug: string; title: string }, patch: ServicePatch, id: string): Promise<string> {
  const base = patch.slug ?? (patch.title !== undefined && patch.title !== existing.title ? patch.title : undefined)
  if (base === undefined || slugify(base) === existing.slug) return existing.slug
  return uniqueSlug(prisma, 'service', base, id)
}

async function list(query: ServiceListQuery = {}) {
  const { page, limit, skip } = parsePagination(query)
  const where = listWhere(query)
  const [rows, total] = await prisma.$transaction([
    prisma.service.findMany({ where, include: SERVICE_INCLUDE, orderBy: BY_ORDER, skip, take: limit }),
    prisma.service.count({ where }),
  ])
  return withMeta(rows.map(toAdminService), { page, limit, total })
}

async function get(id: string) {
  return toAdminService(await find(id))
}

async function create(input: ServiceInput) {
  await assertMediaExists(prisma, input.imageId, MEDIA_LABEL)
  const slug = await uniqueSlug(prisma, 'service', input.slug ?? input.title)
  const last = await prisma.service.aggregate({ _max: { sortOrder: true } })
  const created = await prisma.service.create({
    data: { ...input, slug, sortOrder: (last._max.sortOrder ?? FIRST_SORT_ORDER - 1) + 1 },
    include: SERVICE_INCLUDE,
  })
  revalidateSite(tagsFor('service', created.slug))
  return toAdminService(created)
}

async function update(id: string, patch: ServicePatch) {
  const existing = await find(id)
  await assertMediaExists(prisma, patch.imageId, MEDIA_LABEL)
  const slug = await nextSlug(existing, patch, id)
  const updated = await prisma.service.update({ where: { id }, data: { ...patch, slug }, include: SERVICE_INCLUDE })
  revalidateSite([...tagsFor('service', existing.slug), ...tagsFor('service', updated.slug)])
  return toAdminService(updated)
}

async function publish(id: string, isPublished: boolean) {
  const existing = await find(id)
  const updated = await prisma.service.update({ where: { id }, data: { isPublished }, include: SERVICE_INCLUDE })
  revalidateSite(tagsFor('service', existing.slug))
  return toAdminService(updated)
}

async function reorder(ids: string[]) {
  const current = await prisma.service.findMany({ select: { id: true, slug: true } })
  assertExactOrder(ids, current.map((s) => s.id), 'service')
  await prisma.$transaction(ids.map((id, sortOrder) => prisma.service.update({ where: { id }, data: { sortOrder } })))
  revalidateSite(current.flatMap((s) => tagsFor('service', s.slug)))
  return list({ limit: MAX_LIMIT })
}

async function remove(id: string) {
  const existing = await find(id)
  await prisma.service.delete({ where: { id } })
  revalidateSite(tagsFor('service', existing.slug))
  return { id }
}

export const servicesService = { list, get, create, update, publish, reorder, remove }
