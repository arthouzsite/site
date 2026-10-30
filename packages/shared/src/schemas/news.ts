import { z } from 'zod'
import { nullableIdSchema, optionalText, optionalUrlSchema, requiredText, slugSchema } from './common'

export const newsInputSchema = z.object({
  slug: slugSchema,
  title: requiredText(400),
  excerpt: optionalText(2000),
  publishedAt: z.coerce.date(),
  imageId: nullableIdSchema,
  externalUrl: optionalUrlSchema,
  exhibitionId: nullableIdSchema,
  isPublished: z.boolean().default(false),
})

export type NewsInput = z.infer<typeof newsInputSchema>
