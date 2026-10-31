import { publishSchema } from '@/lib/shared'
import { z } from 'zod'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { exhibitionsService } from '@/lib/server/exhibitions/exhibitions.service'

const bulkPublishSchema = publishSchema.extend({ ids: z.array(z.string().uuid()).min(1) })

export const PATCH = route('user', async ({ request }) => {
  const body = await parseBody(request, bulkPublishSchema)
  return exhibitionsService.bulkPublish(body.ids, body.isPublished)
})
