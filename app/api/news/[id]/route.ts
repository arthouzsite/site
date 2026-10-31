import { newsInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { newsService } from '@/lib/server/news/news.service'

type Params = { id: string }

export const GET = route<Params>('user', ({ params }) => newsService.get(params.id))

export const PATCH = route<Params>('user', async ({ params, request }) =>
  newsService.update(params.id, await parseBody(request, newsInputSchema)),
)

export const DELETE = route<Params>('user', ({ params }) => newsService.remove(params.id))
