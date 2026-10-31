import { artistInputSchema } from '@/lib/shared'
import { getArtist, removeArtist, updateArtist } from '@/lib/server/artists/artists.service'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'

export const GET = route<{ id: string }>('user', ({ params }) => getArtist(params.id))

export const PATCH = route<{ id: string }>('user', async ({ params, request }) =>
  updateArtist(params.id, await parseBody(request, artistInputSchema)),
)

export const DELETE = route<{ id: string }>('user', ({ params }) => removeArtist(params.id))
