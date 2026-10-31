import { reorderSchema } from '@/lib/shared'
import { artworksService } from '@/lib/server/artworks/artworks.service'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'

export const PUT = route<{ id: string }>('user', async ({ params, request }) => {
  const body = await parseBody(request, reorderSchema)
  return artworksService.reorder(params.id, body.ids)
})
