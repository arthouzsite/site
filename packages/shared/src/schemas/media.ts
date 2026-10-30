import { z } from 'zod'

export const mediaPatchSchema = z.object({
  alt: z.string().trim().min(1).max(500),
  caption: z.string().trim().max(1000).nullable().optional(),
})

export type MediaPatch = z.infer<typeof mediaPatchSchema>
