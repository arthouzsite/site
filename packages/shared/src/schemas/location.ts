import { z } from 'zod'
import { nullableIdSchema, optionalText, requiredText, slugSchema, urlSchema } from './common'

const TEL_PATTERN = /^\+\d{8,15}$/
const TEL_MESSAGE = 'Use international format, e.g. +914412345678'

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
