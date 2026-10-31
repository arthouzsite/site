import { locationInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import * as locations from '@/lib/server/locations/locations.service'

type Params = { id: string }

export const GET = route<Params>('user', ({ params }) => locations.get(params.id))

export const PATCH = route<Params>('user', async ({ params, request }) =>
  locations.update(params.id, await parseBody(request, locationInputSchema)),
)

export const DELETE = route<Params>('user', ({ params }) => locations.remove(params.id))
