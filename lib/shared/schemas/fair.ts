import { z } from 'zod'
import { nullableIdSchema, optionalText, requiredText, slugSchema } from './common'

export const fairInputSchema = z.object({
  slug: slugSchema,
  title: requiredText(300),
  venue: optionalText(300),
  city: optionalText(100),
  dateLabel: optionalText(100),
  booth: optionalText(100),
  text: optionalText(5000),
  imageId: nullableIdSchema,
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
})

export type FairInput = z.infer<typeof fairInputSchema>
