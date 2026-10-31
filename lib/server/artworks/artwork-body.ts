import { artworkInputSchema } from '@/lib/shared'

/** The artist comes from the URL, so it is not part of the request body. */
export const artworkBodySchema = artworkInputSchema.omit({ artistId: true })
