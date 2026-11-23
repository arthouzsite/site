import { printCategoryInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { printsService } from '@/lib/server/prints/prints.service'

type Params = { id: string }

export const PATCH = route<Params>('user', async ({ params, request }) =>
  printsService.update(params.id, await parseBody(request, printCategoryInputSchema)),
)

export const DELETE = route<Params>('user', ({ params }) => printsService.remove(params.id))
