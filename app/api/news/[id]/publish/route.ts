import { publishSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { newsService } from '@/lib/server/news/news.service'

export const PATCH = route<{ id: string }>('user', async ({ params, request }) =>
  newsService.publish(params.id, (await parseBody(request, publishSchema)).isPublished),
)
