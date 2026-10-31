import { z } from 'zod'
import { userInputSchema } from '@/lib/shared'

export const userUpdateSchema = userInputSchema.omit({ email: true }).partial().extend({ isDisabled: z.boolean().optional() })
