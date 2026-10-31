import { artworkBodySchema } from '@/lib/server/artworks/artwork-body'
import { artworksService } from '@/lib/server/artworks/artworks.service'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'

type Params = { id: string }

export const PATCH = route<Params>('user', async ({ params, request }) =>
  artworksService.update(params.id, await parseBody(request, artworkBodySchema)),
)

export const DELETE = route<Params>('user', ({ params }) => artworksService.remove(params.id))
