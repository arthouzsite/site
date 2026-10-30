import { z } from 'zod'
import { nullableIdSchema, optionalText, requiredText, slugSchema, TEL_MESSAGE, TEL_PATTERN, urlSchema } from './common'

export const locationInputSchema = z.object({
  slug: slugSchema,
  city: requiredText(100),
  address: optionalText(500),
  phone: optionalText(50),
  tel: z.string().trim().regex(TEL_PATTERN, TEL_MESSAGE).or(z.literal('')).default(''),
  days: optionalText(200),
  hours: optionalText(200),
  mapUrl: urlSchema.or(z.literal('')).default(''),
  imageId: nullableIdSchema,
  sortOrder: z.number().int().default(0),
})

export type LocationInput = z.infer<typeof locationInputSchema>
