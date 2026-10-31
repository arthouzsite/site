import { z } from 'zod'
import { idSchema, nullableIdSchema, optionalText, requiredText } from './common'

export const artworkInputSchema = z.object({
  artistId: idSchema,
  title: requiredText(300),
  year: z.string().trim().max(20).default(''),
  medium: optionalText(300),
  size: optionalText(100),
  imageId: nullableIdSchema,
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
})

export type ArtworkInput = z.infer<typeof artworkInputSchema>
