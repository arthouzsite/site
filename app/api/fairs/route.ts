import { fairInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { fairsService } from '@/lib/server/fairs/fairs.service'

const CREATED = 201

export const GET = route('user', () => fairsService.list())

export const POST = route('user', async ({ request }) => fairsService.create(await parseBody(request, fairInputSchema)), { status: CREATED })
