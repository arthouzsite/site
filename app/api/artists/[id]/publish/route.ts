import { publishSchema } from '@/lib/shared'
import { publishArtist } from '@/lib/server/artists/artists.service'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'

export const PATCH = route<{ id: string }>('user', async ({ params, request }) =>
  publishArtist(params.id, (await parseBody(request, publishSchema)).isPublished),
)
