import { z } from 'zod'
import { EXHIBITION_STATUSES, EXHIBITION_TYPES } from '../constants'
import { idSchema, nullableIdSchema, optionalText, requiredText, slugSchema } from './common'

const END_BEFORE_START_MESSAGE = 'End date must be on or after the start date'

export const exhibitionInputSchema = z
  .object({
    slug: slugSchema,
    title: requiredText(300),
    subtitle: optionalText(300),
    city: requiredText(100),
    country: requiredText(100),
    type: z.enum(EXHIBITION_TYPES),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    datesLabel: z.string().trim().max(200).nullable().default(null),
    statusOverride: z.enum(EXHIBITION_STATUSES).nullable().default(null),
    venue: optionalText(300),
    blurb: optionalText(1000),
    body: optionalText(20000),
    heroImageId: nullableIdSchema,
    artistIds: z.array(idSchema).default([]),
    isPublished: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  })
  .refine((v) => v.endDate.getTime() >= v.startDate.getTime(), {
    message: END_BEFORE_START_MESSAGE,
    path: ['endDate'],
  })

export const exhibitionWorkInputSchema = z.object({
  imageId: idSchema,
  title: requiredText(300),
  year: z.string().trim().max(20).default(''),
  artistId: idSchema,
  medium: optionalText(300),
})

export type ExhibitionInput = z.infer<typeof exhibitionInputSchema>
export type ExhibitionWorkInput = z.infer<typeof exhibitionWorkInputSchema>
