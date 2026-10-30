import { Injectable, NotFoundException } from '@nestjs/common'
import { z, ZodError } from 'zod'
import { slugify, tagsFor, type NewsInput } from '@arthouz/shared'
import { withMeta } from '../common/envelope.interceptor'
import { assertMediaExists } from '../common/media-exists'
import { parsePagination } from '../common/pagination'
import { PrismaService } from '../common/prisma.service'
import { uniqueSlug } from '../common/slugs'
import type { Prisma } from '../generated/prisma/client'
import { RevalidateService } from '../revalidate/revalidate.service'
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
  const { slug: _slug, isPublished: _isPublished, ...rest } = input
  return { ...rest, slug }
}

const slugBase = (text: string) => slugify(text) || FALLBACK_SLUG

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async list(query: NewsListQuery) {
    const { page, limit, skip } = parsePagination(query)
    const where = listWhere(query)
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.news.findMany({ where, include: NEWS_INCLUDE, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }], skip, take: limit }),
      this.prisma.news.count({ where }),
    ])
    return withMeta(rows.map(toAdminNews), { page, limit, total })
  }

  async get(id: string) {
    return toAdminNews(await this.find(id))
  }

  async create(input: NewsInput) {
    await this.assertReferences(input)
    const slug = await uniqueSlug(this.prisma, 'news', slugBase(input.slug ?? input.title))
    const created = await this.prisma.news.create({
      data: { ...writableFields(input, slug), isPublished: input.isPublished },
      include: NEWS_INCLUDE,
    })
    this.revalidate.trigger(tagsFor('news', created.slug))
    return toAdminNews(created)
  }

  async update(id: string, input: NewsInput) {
    const existing = await this.find(id)
    await this.assertReferences(input)
    const slug = await this.nextSlug(existing, input, id)
    const updated = await this.prisma.news.update({ where: { id }, data: writableFields(input, slug), include: NEWS_INCLUDE })
    this.revalidate.trigger([...tagsFor('news', existing.slug), ...tagsFor('news', updated.slug)])
    return toAdminNews(updated)
  }

  async publish(id: string, isPublished: boolean) {
    const existing = await this.find(id)
    const updated = await this.prisma.news.update({ where: { id }, data: { isPublished }, include: NEWS_INCLUDE })
    this.revalidate.trigger(tagsFor('news', existing.slug))
    return toAdminNews(updated)
  }

  async remove(id: string) {
    const existing = await this.find(id)
    await this.prisma.news.delete({ where: { id } })
    this.revalidate.trigger(tagsFor('news', existing.slug))
    return { id }
  }

  private async assertReferences(input: NewsInput): Promise<void> {
    await assertMediaExists(this.prisma, input.imageId)
    if (!input.exhibitionId) return
    const exhibition = await this.prisma.exhibition.findUnique({ where: { id: input.exhibitionId }, select: { id: true } })
    if (!exhibition) {
      // ZodError is mapped by the exception filter to 400 VALIDATION with per-field messages.
      throw new ZodError([{ code: 'custom', path: ['exhibitionId'], message: EXHIBITION_NOT_FOUND }])
    }
  }

  // A supplied slug or a changed title re-derives the slug; otherwise it is kept.
  private async nextSlug(existing: { slug: string; title: string }, input: NewsInput, id: string): Promise<string> {
    const base = input.slug ?? (input.title !== existing.title ? input.title : undefined)
    if (base === undefined || slugBase(base) === existing.slug) return existing.slug
    return uniqueSlug(this.prisma, 'news', slugBase(base), id)
  }

  private async find(id: string) {
    const row = await this.prisma.news.findUnique({ where: { id }, include: NEWS_INCLUDE })
    if (!row) throw new NotFoundException(NOT_FOUND)
    return row
  }
}
