import { slugify, tagsFor, type FairInput } from '@/lib/shared'
import { assertExactOrder } from '@/lib/server/common/exact-order'
import { assertMediaExists } from '@/lib/server/common/media-exists'
import { uniqueSlug } from '@/lib/server/common/slugs'
import { notFound } from '@/lib/server/http/errors'
import { withMeta } from '@/lib/server/http/route'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { FAIR_INCLUDE, toAdminFair } from './fairs.mapper'

const NOT_FOUND = 'Fair not found'
const FIRST_SORT_ORDER = 0

// Scalars written by create/update. sortOrder and isPublished have their own endpoints.
function writableFields(input: FairInput, slug: string) {
  const { title, venue, city, dateLabel, booth, text, imageId } = input
  return { title, venue, city, dateLabel, booth, text, imageId, slug }
}

async function find(id: string) {
  const row = await prisma.fair.findUnique({ where: { id }, include: FAIR_INCLUDE })
  if (!row) throw notFound(NOT_FOUND)
  return row
}

// A supplied slug or a changed title re-derives the slug; otherwise it is kept.
async function nextSlug(existing: { slug: string; title: string }, input: FairInput, id: string): Promise<string> {
  const base = input.slug ?? (input.title !== existing.title ? input.title : undefined)
  if (base === undefined || slugify(base) === existing.slug) return existing.slug
  return uniqueSlug(prisma, 'fair', base, id)
}

async function list() {
  const rows = await prisma.fair.findMany({ include: FAIR_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  return withMeta(rows.map(toAdminFair), { page: 1, limit: Math.max(rows.length, 1), total: rows.length })
}

async function get(id: string) {
  return toAdminFair(await find(id))
}

async function create(input: FairInput) {
  await assertMediaExists(prisma, input.imageId)
  const slug = await uniqueSlug(prisma, 'fair', input.slug ?? input.title)
  const last = await prisma.fair.aggregate({ _max: { sortOrder: true } })
  const created = await prisma.fair.create({
    data: { ...writableFields(input, slug), isPublished: input.isPublished, sortOrder: (last._max.sortOrder ?? FIRST_SORT_ORDER - 1) + 1 },
    include: FAIR_INCLUDE,
  })
  revalidateSite(tagsFor('fair', created.slug))
  return toAdminFair(created)
}

async function update(id: string, input: FairInput) {
  const existing = await find(id)
  await assertMediaExists(prisma, input.imageId)
  const slug = await nextSlug(existing, input, id)
  const updated = await prisma.fair.update({ where: { id }, data: writableFields(input, slug), include: FAIR_INCLUDE })
  revalidateSite([...tagsFor('fair', existing.slug), ...tagsFor('fair', updated.slug)])
  return toAdminFair(updated)
}

async function publish(id: string, isPublished: boolean) {
  const existing = await find(id)
  const updated = await prisma.fair.update({ where: { id }, data: { isPublished }, include: FAIR_INCLUDE })
  revalidateSite(tagsFor('fair', existing.slug))
  return toAdminFair(updated)
}

async function reorder(ids: string[]) {
  const current = await prisma.fair.findMany({ select: { id: true, slug: true } })
  assertExactOrder(ids, current.map((f) => f.id), 'fair')
  await prisma.$transaction(ids.map((id, sortOrder) => prisma.fair.update({ where: { id }, data: { sortOrder } })))
  revalidateSite(current.flatMap((f) => tagsFor('fair', f.slug)))
  return list()
}

async function remove(id: string) {
  const existing = await find(id)
  await prisma.fair.delete({ where: { id } })
  revalidateSite(tagsFor('fair', existing.slug))
  return { id }
}

export const fairsService = { list, get, create, update, publish, reorder, remove }
