import { exhibitionInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { exhibitionsService } from '@/lib/server/exhibitions/exhibitions.service'

type Params = { id: string }

export const GET = route<Params>('user', ({ params }) => exhibitionsService.get(params.id))

export const PATCH = route<Params>('user', async ({ params, request }) =>
  exhibitionsService.update(params.id, await parseBody(request, exhibitionInputSchema)),
)

export const DELETE = route<Params>('user', ({ params }) => exhibitionsService.remove(params.id))
