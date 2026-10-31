import { exhibitionWorkInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { exhibitionWorksService } from '@/lib/server/exhibitions/exhibition-works.service'

type Params = { workId: string }

export const PATCH = route<Params>('user', async ({ params, request }) =>
  exhibitionWorksService.update(params.workId, await parseBody(request, exhibitionWorkInputSchema)),
)

export const DELETE = route<Params>('user', ({ params }) => exhibitionWorksService.remove(params.workId))
