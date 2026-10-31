import { exhibitionWorkInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'
import { exhibitionWorksService } from '@/lib/server/exhibitions/exhibition-works.service'

type Params = { id: string }

export const GET = route<Params>('user', ({ params }) => exhibitionWorksService.list(params.id))

export const POST = route<Params>(
  'user',
  async ({ params, request }) => exhibitionWorksService.create(params.id, await parseBody(request, exhibitionWorkInputSchema)),
  { status: CREATED },
)
