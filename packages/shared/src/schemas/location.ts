import { z } from 'zod'
import { nullableIdSchema, optionalText, requiredText, slugSchema, urlSchema } from './common'

export const locationInputSchema = z.object({
  slug: slugSchema,
  city: requiredText(100),
  address: optionalText(500),
  phone: optionalText(50),
  tel: z.string().trim().max(20).default(''),
  days: optionalText(200),
  hours: optionalText(200),
  mapUrl: urlSchema.or(z.literal('')).default(''),
  imageId: nullableIdSchema,
  sortOrder: z.number().int().default(0),
})

export type LocationInput = z.infer<typeof locationInputSchema>
