import { z } from 'zod'
import { MIN_PASSWORD_LENGTH, ROLES } from '../constants'
import { requiredText } from './common'

export const userInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: requiredText(200),
  role: z.enum(ROLES),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200).optional(),
})

export type UserInput = z.infer<typeof userInputSchema>
