import { artworkBodySchema } from '@/lib/server/artworks/artwork-body'
import { artworksService } from '@/lib/server/artworks/artworks.service'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'

type Params = { id: string }

export const GET = route<Params>('user', ({ params }) => artworksService.list(params.id))

export const POST = route<Params>(
  'user',
  async ({ params, request }) => artworksService.create(params.id, await parseBody(request, artworkBodySchema)),
  { status: CREATED },
)
