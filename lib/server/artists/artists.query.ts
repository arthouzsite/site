import { z } from 'zod'
import type { Prisma } from '@/lib/server/generated/prisma/client'

const MAX_SEARCH_LENGTH = 120
const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
const NON_LETTER_BUCKET = '#'

export const artistListQuerySchema = z.object({
  q: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  letter: z.string().regex(/^([A-Z]|#)$/, 'letter must be A-Z or #').optional(),
  featured: z.enum(['true', 'false']).optional(),
  published: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
})

export type ArtistListQuery = z.infer<typeof artistListQuerySchema>

const prefix = (l: string): Prisma.ArtistWhereInput => ({ sortName: { startsWith: l, mode: 'insensitive' } })

// "#" = first character is not A-Z: NOT of the 26 letter prefixes (no raw SQL).
function letterWhere(letter: string): Prisma.ArtistWhereInput {
  return letter === NON_LETTER_BUCKET ? { NOT: { OR: ALPHABET.map(prefix) } } : prefix(letter)
}

export function artistListWhere(query: ArtistListQuery): Prisma.ArtistWhereInput {
  const and: Prisma.ArtistWhereInput[] = []
  if (query.letter) and.push(letterWhere(query.letter))
  if (query.featured) and.push({ isFeatured: query.featured === 'true' })
  if (query.published) and.push({ isPublished: query.published === 'true' })
  if (query.q) and.push({ OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { sortName: { contains: query.q, mode: 'insensitive' } }] })
  return { AND: and }
}
