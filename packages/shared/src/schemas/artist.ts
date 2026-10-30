import { z } from 'zod'
import { nullableIdSchema, optionalText, requiredText, slugSchema } from './common'

export const artistInputSchema = z.object({
  slug: slugSchema,
  name: requiredText(200),
  sortName: z.string().trim().max(200).optional(),
  medium: optionalText(300),
  base: optionalText(100),
  born: z.string().trim().max(50).nullable().default(null),
  lede: optionalText(1000),
  bio: optionalText(20000),
  portraitImageId: nullableIdSchema,
  isFeatured: z.boolean().default(false),
  featuredOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
})

export type ArtistInput = z.infer<typeof artistInputSchema>
