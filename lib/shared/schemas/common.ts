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

/** Display phone number as people write it: digits with spaces, +, -, dots, slashes or brackets, nothing else (FIN-3500). */
export const PHONE_PATTERN = /^[\d\s+().\-/]*\d[\d\s+().\-/]*$/
export const PHONE_MESSAGE = 'Use digits only, with spaces, +, - or brackets'
export const optionalPhone = (max = 50) => z.string().trim().max(max).regex(PHONE_PATTERN, PHONE_MESSAGE).or(z.literal('')).default('')

/** A person's name never contains digits (FIN-3483). */
export const NO_DIGITS_PATTERN = /^\D*$/
export const NAME_MESSAGE = 'Name cannot contain numbers'
export const personName = (max = 200) => requiredText(max).regex(NO_DIGITS_PATTERN, NAME_MESSAGE)

export const publishSchema = z.object({ isPublished: z.boolean() })
export const reorderSchema = z.object({ ids: z.array(idSchema) })

export type PublishInput = z.infer<typeof publishSchema>
export type ReorderInput = z.infer<typeof reorderSchema>
