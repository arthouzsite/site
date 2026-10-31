import { servicePatchSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { servicesService } from '@/lib/server/services/services.service'

type Params = { id: string }

export const GET = route<Params>('user', ({ params }) => servicesService.get(params.id))

export const PATCH = route<Params>('user', async ({ params, request }) =>
  servicesService.update(params.id, await parseBody(request, servicePatchSchema)),
)

export const DELETE = route<Params>('user', ({ params }) => servicesService.remove(params.id))
