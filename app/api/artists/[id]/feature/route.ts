import { z } from 'zod'
import { setArtistFeatured } from '@/lib/server/artists/artists.service'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'

const featureSchema = z.object({ isFeatured: z.boolean() })

export const PATCH = route<{ id: string }>('user', async ({ params, request }) =>
  setArtistFeatured(params.id, (await parseBody(request, featureSchema)).isFeatured),
)
