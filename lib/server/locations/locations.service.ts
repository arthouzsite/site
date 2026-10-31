import { slugify, tagsFor, type LocationInput } from '@/lib/shared'
import { assertExactOrder } from '@/lib/server/common/exact-order'
import { assertMediaExists } from '@/lib/server/common/media-exists'
import { uniqueSlug } from '@/lib/server/common/slugs'
import { notFound } from '@/lib/server/http/errors'
import { withMeta } from '@/lib/server/http/route'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { LOCATION_INCLUDE, toAdminLocation } from './locations.mapper'

const NOT_FOUND = 'Location not found'
const FIRST_SORT_ORDER = 0
const FIRST_PAGE = 1

// Scalars written by create/update. sortOrder has its own endpoint.
function writableFields(input: LocationInput, slug: string) {
  const { city, address, phone, tel, days, hours, mapUrl, imageId } = input
  return { city, address, phone, tel, days, hours, mapUrl, imageId, slug }
}

async function find(id: string) {
  const row = await prisma.location.findUnique({ where: { id }, include: LOCATION_INCLUDE })
  if (!row) throw notFound(NOT_FOUND)
  return row
}

// A supplied slug or a changed city re-derives the slug; otherwise it is kept.
async function nextSlug(existing: { slug: string; city: string }, input: LocationInput, id: string): Promise<string> {
  const base = input.slug ?? (input.city !== existing.city ? input.city : undefined)
  if (base === undefined || slugify(base) === existing.slug) return existing.slug
  return uniqueSlug(prisma, 'location', base, id)
}

export async function list() {
  const rows = await prisma.location.findMany({ include: LOCATION_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  return withMeta(rows.map(toAdminLocation), { page: FIRST_PAGE, limit: Math.max(rows.length, 1), total: rows.length })
}

export async function get(id: string) {
  return toAdminLocation(await find(id))
}

export async function create(input: LocationInput) {
  await assertMediaExists(prisma, input.imageId)
  const slug = await uniqueSlug(prisma, 'location', input.slug ?? input.city)
  const last = await prisma.location.aggregate({ _max: { sortOrder: true } })
  const created = await prisma.location.create({
    data: { ...writableFields(input, slug), sortOrder: (last._max.sortOrder ?? FIRST_SORT_ORDER - 1) + 1 },
    include: LOCATION_INCLUDE,
  })
  revalidateSite(tagsFor('location', created.slug))
  return toAdminLocation(created)
}

export async function update(id: string, input: LocationInput) {
  const existing = await find(id)
  await assertMediaExists(prisma, input.imageId)
  const slug = await nextSlug(existing, input, id)
  const updated = await prisma.location.update({ where: { id }, data: writableFields(input, slug), include: LOCATION_INCLUDE })
  revalidateSite([...tagsFor('location', existing.slug), ...tagsFor('location', updated.slug)])
  return toAdminLocation(updated)
}

export async function reorder(ids: string[]) {
  const current = await prisma.location.findMany({ select: { id: true, slug: true } })
  assertExactOrder(ids, current.map((l) => l.id), 'location')
  await prisma.$transaction(ids.map((id, sortOrder) => prisma.location.update({ where: { id }, data: { sortOrder } })))
  revalidateSite(current.flatMap((l) => tagsFor('location', l.slug)))
  return list()
}

export async function remove(id: string) {
  const existing = await find(id)
  await prisma.location.delete({ where: { id } })
  revalidateSite(tagsFor('location', existing.slug))
  return { id }
}
