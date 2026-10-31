import { z, ZodError } from 'zod'
import { slugify, tagsFor, type NewsInput } from '@/lib/shared'
import { assertMediaExists } from '@/lib/server/common/media-exists'
import { parsePagination } from '@/lib/server/common/pagination'
import { uniqueSlug } from '@/lib/server/common/slugs'
import type { Prisma } from '@/lib/server/generated/prisma/client'
import { notFound } from '@/lib/server/http/errors'
import { withMeta } from '@/lib/server/http/route'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { exhibitionSlugsByIds, exhibitionTagsForSlugs } from './exhibition-tags'
import { NEWS_INCLUDE, toAdminNews } from './news.mapper'

const MAX_SEARCH_LENGTH = 120
const NOT_FOUND = 'News item not found'
const EXHIBITION_NOT_FOUND = 'Exhibition not found'
// Titles without Latin characters (e.g. Tamil) slugify to nothing; uniqueSlug then suffixes this.
const FALLBACK_SLUG = 'news'

export const newsListQuerySchema = z.object({
  q: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  published: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
})

export type NewsListQuery = z.infer<typeof newsListQuerySchema>

function listWhere(query: NewsListQuery): Prisma.NewsWhereInput {
  const and: Prisma.NewsWhereInput[] = []
  if (query.published) and.push({ isPublished: query.published === 'true' })
  if (query.q) {
    and.push({ OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { excerpt: { contains: query.q, mode: 'insensitive' } }] })
  }
  return { AND: and }
}

// PATCH never touches publish state (own endpoint).
function writableFields(input: NewsInput, slug: string) {
  const { title, excerpt, publishedAt, imageId, externalUrl, exhibitionId } = input
  return { title, excerpt, publishedAt, imageId, externalUrl, exhibitionId, slug }
}

const slugBase = (text: string) => slugify(text) || FALLBACK_SLUG

// News is listed on its exhibition's page, so a linked exhibition (old or new) must refresh too.
async function exhibitionTags(exhibitionIds: ReadonlyArray<string | null>): Promise<string[]> {
  return exhibitionTagsForSlugs(await exhibitionSlugsByIds(prisma, exhibitionIds))
}

async function assertReferences(input: NewsInput): Promise<void> {
  await assertMediaExists(prisma, input.imageId)
  if (!input.exhibitionId) return
  const exhibition = await prisma.exhibition.findUnique({ where: { id: input.exhibitionId }, select: { id: true } })
  if (!exhibition) {
    // ZodError is mapped by the route wrapper to 400 VALIDATION with per-field messages.
    throw new ZodError([{ code: 'custom', path: ['exhibitionId'], message: EXHIBITION_NOT_FOUND }])
  }
}

// A supplied slug or a changed title re-derives the slug; otherwise it is kept.
async function nextSlug(existing: { slug: string; title: string }, input: NewsInput, id: string): Promise<string> {
  const base = input.slug ?? (input.title !== existing.title ? input.title : undefined)
  if (base === undefined || slugBase(base) === existing.slug) return existing.slug
  return uniqueSlug(prisma, 'news', slugBase(base), id)
}

async function find(id: string) {
  const row = await prisma.news.findUnique({ where: { id }, include: NEWS_INCLUDE })
  if (!row) throw notFound(NOT_FOUND)
  return row
}

async function list(query: NewsListQuery) {
  const { page, limit, skip } = parsePagination(query)
  const where = listWhere(query)
  const [rows, total] = await prisma.$transaction([
    prisma.news.findMany({ where, include: NEWS_INCLUDE, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }], skip, take: limit }),
    prisma.news.count({ where }),
  ])
  return withMeta(rows.map(toAdminNews), { page, limit, total })
}

async function get(id: string) {
  return toAdminNews(await find(id))
}

async function create(input: NewsInput) {
  await assertReferences(input)
  const slug = await uniqueSlug(prisma, 'news', slugBase(input.slug ?? input.title))
  const created = await prisma.news.create({
    data: { ...writableFields(input, slug), isPublished: input.isPublished },
    include: NEWS_INCLUDE,
  })
  revalidateSite([...tagsFor('news', created.slug), ...(await exhibitionTags([created.exhibitionId]))])
  return toAdminNews(created)
}

async function update(id: string, input: NewsInput) {
  const existing = await find(id)
  await assertReferences(input)
  const slug = await nextSlug(existing, input, id)
  const updated = await prisma.news.update({ where: { id }, data: writableFields(input, slug), include: NEWS_INCLUDE })
  revalidateSite([
    ...tagsFor('news', existing.slug),
    ...tagsFor('news', updated.slug),
    ...(await exhibitionTags([existing.exhibitionId, updated.exhibitionId])),
  ])
  return toAdminNews(updated)
}

async function publish(id: string, isPublished: boolean) {
  const existing = await find(id)
  const updated = await prisma.news.update({ where: { id }, data: { isPublished }, include: NEWS_INCLUDE })
  revalidateSite([...tagsFor('news', existing.slug), ...(await exhibitionTags([existing.exhibitionId]))])
  return toAdminNews(updated)
}

async function remove(id: string) {
  const existing = await find(id)
  await prisma.news.delete({ where: { id } })
  revalidateSite([...tagsFor('news', existing.slug), ...(await exhibitionTags([existing.exhibitionId]))])
  return { id }
}

export const newsService = { list, get, create, update, publish, remove }
