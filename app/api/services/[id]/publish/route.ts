import { publishSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { servicesService } from '@/lib/server/services/services.service'

export const PATCH = route<{ id: string }>('user', async ({ params, request }) =>
  servicesService.publish(params.id, (await parseBody(request, publishSchema)).isPublished),
)
