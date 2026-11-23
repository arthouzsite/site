import { printCategoryInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'
import { printsService } from '@/lib/server/prints/prints.service'

export const GET = route('user', () => printsService.list())

export const POST = route('user', async ({ request }) => printsService.create(await parseBody(request, printCategoryInputSchema)), { status: CREATED })
