import { fairInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { fairsService } from '@/lib/server/fairs/fairs.service'

type Params = { id: string }

export const GET = route<Params>('user', ({ params }) => fairsService.get(params.id))

export const PATCH = route<Params>('user', async ({ params, request }) =>
  fairsService.update(params.id, await parseBody(request, fairInputSchema)),
)

export const DELETE = route<Params>('user', ({ params }) => fairsService.remove(params.id))
