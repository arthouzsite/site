import { z } from 'zod'
import { PRINT_CATEGORY_MAX_IMAGES } from '../constants'
import { idSchema, requiredText, slugSchema } from './common'

const IMAGES_TOO_MANY = `A print category holds at most ${PRINT_CATEGORY_MAX_IMAGES} images`
const IMAGE_DUPLICATE = 'An image can appear in a category only once'

/** Ordered media ids of a category. Omitted on update means "leave the images as they are". */
export const printImageIdsSchema = z
  .array(idSchema)
  .max(PRINT_CATEGORY_MAX_IMAGES, IMAGES_TOO_MANY)
  .refine((ids) => new Set(ids).size === ids.length, IMAGE_DUPLICATE)

export const printCategoryInputSchema = z.object({
  slug: slugSchema,
  name: requiredText(100),
  imageIds: printImageIdsSchema.optional(),
})

export type PrintCategoryInput = z.infer<typeof printCategoryInputSchema>
