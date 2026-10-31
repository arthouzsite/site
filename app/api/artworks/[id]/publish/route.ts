import { publishSchema } from '@/lib/shared'
import { artworksService } from '@/lib/server/artworks/artworks.service'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'

export const PATCH = route<{ id: string }>('user', async ({ params, request }) => {
  const body = await parseBody(request, publishSchema)
  return artworksService.publish(params.id, body.isPublished)
})
