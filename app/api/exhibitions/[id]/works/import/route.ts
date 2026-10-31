import { z } from 'zod'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'
import { exhibitionWorksService } from '@/lib/server/exhibitions/exhibition-works.service'

const importSchema = z.object({ artworkId: z.string().uuid() })

export const POST = route<{ id: string }>(
  'user',
  async ({ params, request }) => {
    const body = await parseBody(request, importSchema)
    return exhibitionWorksService.importFromArtwork(params.id, body.artworkId)
  },
  { status: CREATED },
)
