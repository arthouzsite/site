import { PRINT_CATEGORIES_MAX, PRINT_CATEGORY_MAX_IMAGES, slugify, tagsFor, type PrintCategoryInput } from '@/lib/shared'
import { assertExactOrder } from '@/lib/server/common/exact-order'
import { assertMediaIdsExist } from '@/lib/server/common/media-exists'
import { uniqueSlug } from '@/lib/server/common/slugs'
import { badRequest, notFound } from '@/lib/server/http/errors'
import { withMeta } from '@/lib/server/http/route'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { PRINT_CATEGORY_INCLUDE, toAdminPrintCategory } from './prints.mapper'

const NOT_FOUND = 'Print category not found'
const FIRST_SORT_ORDER = 0
const FIRST_PAGE = 1

// Re-checked here because the schema is only one of the ways in; a set past the limit never reaches the database.
async function assertImages(ids: readonly string[] | undefined): Promise<void> {
  if (!ids) return
  if (ids.length > PRINT_CATEGORY_MAX_IMAGES) {
    throw badRequest('PRINT_IMAGE_LIMIT', `A print category holds at most ${PRINT_CATEGORY_MAX_IMAGES} images`)
  }
  await assertMediaIdsExist(prisma, ids, 'print image')
}

const imageRows = (ids: readonly string[]) => ids.map((mediaId, sortOrder) => ({ mediaId, sortOrder }))

async function find(id: string) {
  const row = await prisma.printCategory.findUnique({ where: { id }, include: PRINT_CATEGORY_INCLUDE })
  if (!row) throw notFound(NOT_FOUND)
  return row
}

// A supplied slug or a changed name re-derives the slug; otherwise it is kept.
async function nextSlug(existing: { slug: string; name: string }, input: PrintCategoryInput, id: string): Promise<string> {
  const base = input.slug ?? (input.name !== existing.name ? input.name : undefined)
  if (base === undefined || slugify(base) === existing.slug) return existing.slug
  return uniqueSlug(prisma, 'printCategory', base, id)
}

async function list() {
  const rows = await prisma.printCategory.findMany({ include: PRINT_CATEGORY_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  return withMeta(rows.map(toAdminPrintCategory), { page: FIRST_PAGE, limit: Math.max(rows.length, 1), total: rows.length })
}

async function create(input: PrintCategoryInput) {
  if ((await prisma.printCategory.count()) >= PRINT_CATEGORIES_MAX) {
    throw badRequest('PRINT_CATEGORY_LIMIT', `Prints holds at most ${PRINT_CATEGORIES_MAX} categories`)
  }
  await assertImages(input.imageIds)
  const slug = await uniqueSlug(prisma, 'printCategory', input.slug ?? input.name)
  const last = await prisma.printCategory.aggregate({ _max: { sortOrder: true } })
  const created = await prisma.printCategory.create({
    data: {
      name: input.name, slug, sortOrder: (last._max.sortOrder ?? FIRST_SORT_ORDER - 1) + 1,
      images: { create: imageRows(input.imageIds ?? []) },
    },
    include: PRINT_CATEGORY_INCLUDE,
  })
  revalidateSite(tagsFor('print', created.slug))
  return toAdminPrintCategory(created)
}

async function update(id: string, input: PrintCategoryInput) {
  const existing = await find(id)
  await assertImages(input.imageIds)
  const slug = await nextSlug(existing, input, id)
  // deleteMany + create run in the category's own write, so a failed save never leaves a half-replaced set.
  const images = input.imageIds ? { images: { deleteMany: {}, create: imageRows(input.imageIds) } } : {}
  const updated = await prisma.printCategory.update({ where: { id }, data: { name: input.name, slug, ...images }, include: PRINT_CATEGORY_INCLUDE })
  revalidateSite([...tagsFor('print', existing.slug), ...tagsFor('print', updated.slug)])
  return toAdminPrintCategory(updated)
}

async function reorder(ids: string[]) {
  const current = await prisma.printCategory.findMany({ select: { id: true, slug: true } })
  assertExactOrder(ids, current.map((c) => c.id), 'print category')
  await prisma.$transaction(ids.map((id, sortOrder) => prisma.printCategory.update({ where: { id }, data: { sortOrder } })))
  revalidateSite(current.flatMap((c) => tagsFor('print', c.slug)))
  return list()
}

async function remove(id: string) {
  const existing = await find(id)
  await prisma.printCategory.delete({ where: { id } })
  revalidateSite(tagsFor('print', existing.slug))
  return { id }
}

export const printsService = { list, create, update, reorder, remove }
