import { z } from 'zod'
import { FAIR_GALLERY_MAX_IMAGES } from '../constants'
import { idSchema, nullableIdSchema, optionalText, requiredText, slugSchema } from './common'

const GALLERY_TOO_LONG = `A fair gallery holds at most ${FAIR_GALLERY_MAX_IMAGES} images`
const GALLERY_DUPLICATE = 'An image can appear in the gallery only once'

/** Ordered gallery media ids. Omitted on update means "leave the gallery as it is". */
export const fairGalleryIdsSchema = z
  .array(idSchema)
  .max(FAIR_GALLERY_MAX_IMAGES, GALLERY_TOO_LONG)
  .refine((ids) => new Set(ids).size === ids.length, GALLERY_DUPLICATE)

export const fairInputSchema = z.object({
  slug: slugSchema,
  title: requiredText(300),
  venue: optionalText(300),
  city: optionalText(100),
  dateLabel: optionalText(100),
  booth: optionalText(100),
  text: optionalText(5000),
  imageId: nullableIdSchema,
  galleryImageIds: fairGalleryIdsSchema.optional(),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
})

export type FairInput = z.infer<typeof fairInputSchema>
