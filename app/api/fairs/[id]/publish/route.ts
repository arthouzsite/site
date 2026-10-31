import { publishSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { fairsService } from '@/lib/server/fairs/fairs.service'

export const PATCH = route<{ id: string }>('user', async ({ params, request }) =>
  fairsService.publish(params.id, (await parseBody(request, publishSchema)).isPublished),
)
