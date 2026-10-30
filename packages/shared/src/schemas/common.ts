import { z } from 'zod'

export const idSchema = z.string().uuid()
export const nullableIdSchema = idSchema.nullable().default(null)
export const slugSchema = z.string().min(1).max(200).optional()
export const requiredText = (max = 500) => z.string().trim().min(1).max(max)
export const optionalText = (max = 5000) => z.string().trim().max(max).default('')
export const urlSchema = z.string().url().max(2000)
export const optionalUrlSchema = urlSchema.nullable().default(null)

export const publishSchema = z.object({ isPublished: z.boolean() })
export const reorderSchema = z.object({ ids: z.array(idSchema) })

export type PublishInput = z.infer<typeof publishSchema>
export type ReorderInput = z.infer<typeof reorderSchema>
