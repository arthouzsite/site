import { newsInputSchema } from '@/lib/shared'
import { parseBody, parseQuery } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'
import { newsListQuerySchema, newsService } from '@/lib/server/news/news.service'

export const GET = route('user', ({ url }) => newsService.list(parseQuery(url, newsListQuerySchema)))

export const POST = route('user', async ({ request }) => newsService.create(await parseBody(request, newsInputSchema)), { status: CREATED })
