import { z } from 'zod'

export const idSchema = z.string().uuid()
export const nullableIdSchema = idSchema.nullable().default(null)
export const slugSchema = z.string().min(1).max(200).optional()
export const requiredText = (max = 500) => z.string().trim().min(1).max(max)
export const optionalText = (max = 5000) => z.string().trim().max(max).default('')
/** http(s) only: rejects javascript:, data: and other schemes that would be unsafe in an href. */
export const httpUrl = () => z.url({ protocol: /^https?$/ })
export const urlSchema = httpUrl().max(2000)
export const optionalUrlSchema = urlSchema.nullable().default(null)

/** International phone number: + followed by 8-15 digits. */
export const TEL_PATTERN = /^\+\d{8,15}$/
export const TEL_MESSAGE = 'Use international format, e.g. +914412345678'

export const publishSchema = z.object({ isPublished: z.boolean() })
export const reorderSchema = z.object({ ids: z.array(idSchema) })

export type PublishInput = z.infer<typeof publishSchema>
export type ReorderInput = z.infer<typeof reorderSchema>
