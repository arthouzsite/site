import { z } from 'zod'
import type { ExhibitionStatus } from '@/lib/shared'
import { CITY_MAX_LENGTH, SEARCH_MAX_LENGTH } from './public.constants'

const query = z.string().trim().max(SEARCH_MAX_LENGTH)

export const publicExhibitionsQuerySchema = z.object({
  status: z
    .enum(['current', 'upcoming', 'past'])
    .transform((v) => v.toUpperCase() as ExhibitionStatus)
    .optional(),
  city: z.string().trim().max(CITY_MAX_LENGTH).optional(),
})
export type PublicExhibitionsQuery = z.infer<typeof publicExhibitionsQuerySchema>

export const publicQSchema = z.object({ q: query.default('') })
export type PublicQ = z.infer<typeof publicQSchema>
