import { reorderSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { exhibitionWorksService } from '@/lib/server/exhibitions/exhibition-works.service'

export const PUT = route<{ id: string }>('user', async ({ params, request }) => {
  const body = await parseBody(request, reorderSchema)
  return exhibitionWorksService.reorder(params.id, body.ids)
})
