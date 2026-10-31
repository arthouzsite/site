import { mediaPatchSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import * as media from '@/lib/server/media/media.service'

type Params = { id: string }

export const GET = route<Params>('user', ({ params }) => media.get(params.id))

export const PATCH = route<Params>('user', async ({ params, request }) =>
  media.patch(params.id, await parseBody(request, mediaPatchSchema)),
)

export const DELETE = route<Params>('user', async ({ params }) => {
  await media.remove(params.id)
  return { id: params.id }
})
