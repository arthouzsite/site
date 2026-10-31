import { fairInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'
import { fairsService } from '@/lib/server/fairs/fairs.service'

export const GET = route('user', () => fairsService.list())

export const POST = route('user', async ({ request }) => fairsService.create(await parseBody(request, fairInputSchema)), { status: CREATED })
