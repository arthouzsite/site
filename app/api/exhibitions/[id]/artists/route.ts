import { z } from 'zod'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { exhibitionsService } from '@/lib/server/exhibitions/exhibitions.service'

const artistsSchema = z.object({ ids: z.array(z.string().uuid()) })

export const PUT = route<{ id: string }>('user', async ({ params, request }) => {
  const body = await parseBody(request, artistsSchema)
  return exhibitionsService.setArtists(params.id, body.ids)
})
