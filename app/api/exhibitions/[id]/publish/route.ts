import { publishSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { exhibitionsService } from '@/lib/server/exhibitions/exhibitions.service'

export const PATCH = route<{ id: string }>('user', async ({ params, request }) => {
  const body = await parseBody(request, publishSchema)
  return exhibitionsService.publish(params.id, body.isPublished)
})
