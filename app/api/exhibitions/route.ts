import { exhibitionInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { exhibitionListQuerySchema, listQueryRecord } from '@/lib/server/exhibitions/exhibition-status'
import { exhibitionsService } from '@/lib/server/exhibitions/exhibitions.service'

export const GET = route('user', ({ url }) => exhibitionsService.list(exhibitionListQuerySchema.parse(listQueryRecord(url))))

export const POST = route(
  'user',
  async ({ request }) => exhibitionsService.create(await parseBody(request, exhibitionInputSchema)),
  { status: 201 },
)
