import { formatMonthYear } from '@arthouz/shared'
import type { Prisma } from '../generated/prisma/client'
import { toImage } from '../common/image.mapper'

export const NEWS_INCLUDE = {
  image: true,
  exhibition: { select: { id: true, title: true, slug: true } },
} satisfies Prisma.NewsInclude
export type NewsRow = Prisma.NewsGetPayload<{ include: typeof NEWS_INCLUDE }>

export function toAdminNews(row: NewsRow) {
  return { ...row, image: toImage(row.image), monthLabel: formatMonthYear(row.publishedAt), exhibition: row.exhibition ?? null }
}
