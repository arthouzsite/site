import type { Prisma } from '@/lib/server/generated/prisma/client'
import { toImage } from '@/lib/server/common/image.mapper'

export const PRINT_CATEGORY_INCLUDE = {
  images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { media: true } },
} satisfies Prisma.PrintCategoryInclude
export type PrintCategoryRow = Prisma.PrintCategoryGetPayload<{ include: typeof PRINT_CATEGORY_INCLUDE }>

export function toAdminPrintCategory(row: PrintCategoryRow) {
  const { images, ...category } = row
  return { ...category, images: images.flatMap((image) => toImage(image.media) ?? []) }
}
