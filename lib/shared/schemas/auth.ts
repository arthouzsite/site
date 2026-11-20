import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
  captchaToken: z.string('Enter the security code').min(1, 'Enter the security code').max(200),
  captchaAnswer: z.string('Enter the security code').trim().min(1, 'Enter the security code').max(20),
})

export type LoginInput = z.infer<typeof loginSchema>
